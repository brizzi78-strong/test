<?php
/**
 * Admin UI: generate drafts, review/preview, approve & send, manage recipients
 * and settings.
 *
 * The two firewall steps live here as physically separate actions:
 *   - "Generate draft" (brm_generate) only writes a draft row.
 *   - "Approve & send" (brm_approve) is a distinct form, on a distinct screen,
 *     behind its own nonce and a confirm checkbox.
 *
 * @package BlueRidgeMailer
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BRM_Admin {

	const MENU_SLUG = 'blue-ridge-mailer';

	/**
	 * Singleton.
	 *
	 * @var BRM_Admin|null
	 */
	protected static $instance = null;

	/**
	 * Get singleton.
	 *
	 * @return BRM_Admin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register admin hooks.
	 */
	public function init() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );

		add_action( 'admin_post_brm_generate', array( $this, 'handle_generate' ) );
		add_action( 'admin_post_brm_save_draft', array( $this, 'handle_save_draft' ) );
		add_action( 'admin_post_brm_send_test', array( $this, 'handle_send_test' ) );
		add_action( 'admin_post_brm_approve', array( $this, 'handle_approve' ) );
		add_action( 'admin_post_brm_save_recipients', array( $this, 'handle_save_recipients' ) );
		add_action( 'admin_post_brm_save_settings', array( $this, 'handle_save_settings' ) );

		add_action( 'admin_notices', array( $this, 'maybe_render_notice' ) );
	}

	/* ---------------------------------------------------------------------
	 * Menu + capability
	 * ------------------------------------------------------------------- */

	/**
	 * Register the menu tree.
	 */
	public function register_menu() {
		add_menu_page(
			__( 'Blue Ridge Mailer', 'blue-ridge-mailer' ),
			__( 'Mailer', 'blue-ridge-mailer' ),
			BRM_CAPABILITY,
			self::MENU_SLUG,
			array( $this, 'render_campaigns_page' ),
			'dashicons-email-alt',
			26
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'Campaigns', 'blue-ridge-mailer' ),
			__( 'Campaigns', 'blue-ridge-mailer' ),
			BRM_CAPABILITY,
			self::MENU_SLUG,
			array( $this, 'render_campaigns_page' )
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'Recipients', 'blue-ridge-mailer' ),
			__( 'Recipients', 'blue-ridge-mailer' ),
			BRM_CAPABILITY,
			'brm-recipients',
			array( $this, 'render_recipients_page' )
		);

		add_submenu_page(
			self::MENU_SLUG,
			__( 'Settings', 'blue-ridge-mailer' ),
			__( 'Settings', 'blue-ridge-mailer' ),
			BRM_CAPABILITY,
			'brm-settings',
			array( $this, 'render_settings_page' )
		);
	}

	/**
	 * Bail unless the current user is allowed.
	 */
	protected function require_cap() {
		if ( ! current_user_can( BRM_CAPABILITY ) ) {
			wp_die( esc_html__( 'You do not have permission to do that.', 'blue-ridge-mailer' ) );
		}
	}

	/* ---------------------------------------------------------------------
	 * Form handlers
	 * ------------------------------------------------------------------- */

	/**
	 * Generate a draft from a brief. Writes a draft row only — never sends.
	 */
	public function handle_generate() {
		$this->require_cap();
		check_admin_referer( 'brm_generate' );

		$brief = isset( $_POST['brief'] ) ? sanitize_textarea_field( wp_unslash( $_POST['brief'] ) ) : '';

		$result = BRM_Claude::generate_draft( $brief );
		if ( is_wp_error( $result ) ) {
			$this->redirect_notice( self::MENU_SLUG, $result->get_error_message(), 'error' );
		}

		$id = BRM_DB::insert_draft(
			array(
				'subject' => $result['subject'],
				'body'    => $result['body'],
				'prompt'  => $brief,
				'model'   => $result['model'],
			)
		);

		if ( ! $id ) {
			$this->redirect_notice( self::MENU_SLUG, __( 'Could not save the draft.', 'blue-ridge-mailer' ), 'error' );
		}

		$this->redirect_to_campaign( $id, __( 'Draft created. Review it below, then approve to send.', 'blue-ridge-mailer' ), 'success' );
	}

	/**
	 * Save edits to a draft's subject/body.
	 */
	public function handle_save_draft() {
		$this->require_cap();
		$id = isset( $_POST['campaign_id'] ) ? (int) $_POST['campaign_id'] : 0;
		check_admin_referer( 'brm_save_draft_' . $id );

		$campaign = BRM_DB::get_campaign( $id );
		if ( ! $campaign || 'draft' !== $campaign->status ) {
			$this->redirect_notice( self::MENU_SLUG, __( 'Only an unsent draft can be edited.', 'blue-ridge-mailer' ), 'error' );
		}

		$subject = isset( $_POST['subject'] ) ? sanitize_text_field( wp_unslash( $_POST['subject'] ) ) : '';
		$body    = isset( $_POST['body'] ) ? sanitize_textarea_field( wp_unslash( $_POST['body'] ) ) : '';

		BRM_DB::update_campaign( $id, array( 'subject' => $subject, 'body' => $body ) );
		$this->redirect_to_campaign( $id, __( 'Draft saved.', 'blue-ridge-mailer' ), 'success' );
	}

	/**
	 * Send a test copy of a draft to one address.
	 */
	public function handle_send_test() {
		$this->require_cap();
		$id = isset( $_POST['campaign_id'] ) ? (int) $_POST['campaign_id'] : 0;
		check_admin_referer( 'brm_send_test_' . $id );

		$email  = isset( $_POST['test_email'] ) ? wp_unslash( $_POST['test_email'] ) : '';
		$result = BRM_Sender::send_test( $id, $email );

		if ( is_wp_error( $result ) ) {
			$this->redirect_to_campaign( $id, $result->get_error_message(), 'error' );
		}
		$this->redirect_to_campaign( $id, __( 'Test email sent.', 'blue-ridge-mailer' ), 'success' );
	}

	/**
	 * Approve a draft and queue the real send. This is the only path that sends.
	 */
	public function handle_approve() {
		$this->require_cap();
		$id = isset( $_POST['campaign_id'] ) ? (int) $_POST['campaign_id'] : 0;
		check_admin_referer( 'brm_approve_' . $id );

		if ( empty( $_POST['confirm_reviewed'] ) ) {
			$this->redirect_to_campaign( $id, __( 'Tick the confirmation box to acknowledge you have read the draft before sending.', 'blue-ridge-mailer' ), 'error' );
		}

		$result = BRM_Sender::approve_and_send( $id );
		if ( is_wp_error( $result ) ) {
			$this->redirect_to_campaign( $id, $result->get_error_message(), 'error' );
		}

		$this->redirect_to_campaign( $id, __( 'Approved. Sending has started and will drip through in batches.', 'blue-ridge-mailer' ), 'success' );
	}

	/**
	 * Bulk add recipients (one email per line, optional "Name <email>").
	 */
	public function handle_save_recipients() {
		$this->require_cap();
		check_admin_referer( 'brm_save_recipients' );

		$raw   = isset( $_POST['recipients'] ) ? wp_unslash( $_POST['recipients'] ) : '';
		$lines = preg_split( '/\r\n|\r|\n/', (string) $raw );
		$added = 0;

		foreach ( $lines as $line ) {
			$line = trim( $line );
			if ( '' === $line ) {
				continue;
			}

			$name  = '';
			$email = $line;
			if ( preg_match( '/^\s*(.*?)\s*<([^>]+)>\s*$/', $line, $m ) ) {
				$name  = $m[1];
				$email = $m[2];
			}

			if ( BRM_DB::upsert_recipient( $email, $name ) ) {
				$added++;
			}
		}

		$this->redirect_notice(
			'brm-recipients',
			sprintf(
				/* translators: %d: number of new recipients. */
				_n( '%d new recipient added.', '%d new recipients added.', $added, 'blue-ridge-mailer' ),
				$added
			),
			'success'
		);
	}

	/**
	 * Save settings (sender identity, address, signoff, optional API key).
	 */
	public function handle_save_settings() {
		$this->require_cap();
		check_admin_referer( 'brm_save_settings' );

		$existing = get_option( 'brm_settings', array() );

		$settings = array(
			'from_name'       => isset( $_POST['from_name'] ) ? sanitize_text_field( wp_unslash( $_POST['from_name'] ) ) : '',
			'from_email'      => isset( $_POST['from_email'] ) ? sanitize_email( wp_unslash( $_POST['from_email'] ) ) : '',
			'reply_to'        => isset( $_POST['reply_to'] ) ? sanitize_email( wp_unslash( $_POST['reply_to'] ) ) : '',
			'signoff'         => isset( $_POST['signoff'] ) ? sanitize_text_field( wp_unslash( $_POST['signoff'] ) ) : '',
			'mailing_address' => isset( $_POST['mailing_address'] ) ? sanitize_textarea_field( wp_unslash( $_POST['mailing_address'] ) ) : '',
		);

		// Only accept an API key from the form if it's NOT pinned in wp-config.php.
		// A blank field leaves any existing stored key untouched.
		if ( ! BRM_Claude::key_from_constant() ) {
			$posted_key = isset( $_POST['api_key'] ) ? trim( wp_unslash( $_POST['api_key'] ) ) : '';
			if ( '' !== $posted_key ) {
				$settings['api_key'] = sanitize_text_field( $posted_key );
			} elseif ( isset( $existing['api_key'] ) ) {
				$settings['api_key'] = $existing['api_key'];
			}
		}

		update_option( 'brm_settings', $settings, false );
		$this->redirect_notice( 'brm-settings', __( 'Settings saved.', 'blue-ridge-mailer' ), 'success' );
	}

	/* ---------------------------------------------------------------------
	 * Redirect + notice helpers
	 * ------------------------------------------------------------------- */

	/**
	 * Redirect back to a page slug with a flash notice.
	 *
	 * @param string $page    admin page slug.
	 * @param string $message Notice text.
	 * @param string $type    success|error.
	 */
	protected function redirect_notice( $page, $message, $type ) {
		$key = 'brm_notice_' . get_current_user_id();
		set_transient( $key, array( 'message' => $message, 'type' => $type ), 60 );
		wp_safe_redirect( admin_url( 'admin.php?page=' . $page ) );
		exit;
	}

	/**
	 * Redirect to a single campaign view with a flash notice.
	 *
	 * @param int    $id      Campaign ID.
	 * @param string $message Notice text.
	 * @param string $type    success|error.
	 */
	protected function redirect_to_campaign( $id, $message, $type ) {
		$key = 'brm_notice_' . get_current_user_id();
		set_transient( $key, array( 'message' => $message, 'type' => $type ), 60 );
		wp_safe_redirect( admin_url( 'admin.php?page=' . self::MENU_SLUG . '&campaign=' . (int) $id ) );
		exit;
	}

	/**
	 * Render any pending flash notice.
	 */
	public function maybe_render_notice() {
		$screen = get_current_screen();
		if ( ! $screen || false === strpos( $screen->id, self::MENU_SLUG ) && false === strpos( $screen->id, 'brm-' ) ) {
			return;
		}

		$key    = 'brm_notice_' . get_current_user_id();
		$notice = get_transient( $key );
		if ( ! $notice ) {
			return;
		}
		delete_transient( $key );

		$class = 'error' === $notice['type'] ? 'notice-error' : 'notice-success';
		printf(
			'<div class="notice %s is-dismissible"><p>%s</p></div>',
			esc_attr( $class ),
			esc_html( $notice['message'] )
		);
	}

	/* ---------------------------------------------------------------------
	 * Views
	 * ------------------------------------------------------------------- */

	/**
	 * Campaigns page: either the single-campaign view or the list + generate form.
	 */
	public function render_campaigns_page() {
		$this->require_cap();

		$campaign_id = isset( $_GET['campaign'] ) ? (int) $_GET['campaign'] : 0;
		if ( $campaign_id ) {
			$this->render_single_campaign( $campaign_id );
			return;
		}

		$campaigns = BRM_DB::list_campaigns();
		$has_key   = BRM_Claude::has_api_key();
		$subscribed = BRM_DB::count_subscribed();
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Blue Ridge Mailer', 'blue-ridge-mailer' ); ?></h1>

			<?php if ( ! $has_key ) : ?>
				<div class="notice notice-warning"><p>
					<?php
					printf(
						/* translators: %s: settings page link. */
						esc_html__( 'No Anthropic API key is configured yet. Add one in %s before generating drafts.', 'blue-ridge-mailer' ),
						'<a href="' . esc_url( admin_url( 'admin.php?page=brm-settings' ) ) . '">' . esc_html__( 'Settings', 'blue-ridge-mailer' ) . '</a>'
					);
					?>
				</p></div>
			<?php endif; ?>

			<h2><?php esc_html_e( 'Generate a new draft', 'blue-ridge-mailer' ); ?></h2>
			<p class="description">
				<?php esc_html_e( 'Describe what the email should say. Claude writes a draft — nothing is sent. You review and approve it as a separate step.', 'blue-ridge-mailer' ); ?>
			</p>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="brm_generate">
				<?php wp_nonce_field( 'brm_generate' ); ?>
				<textarea name="brief" rows="5" class="large-text" placeholder="<?php esc_attr_e( 'e.g. A short, warm check-in to leads who attended last month\'s intro call, inviting them to book a free 20-minute strategy session this week.', 'blue-ridge-mailer' ); ?>"></textarea>
				<p>
					<button type="submit" class="button button-primary" <?php disabled( ! $has_key ); ?>>
						<?php esc_html_e( 'Generate draft', 'blue-ridge-mailer' ); ?>
					</button>
				</p>
			</form>

			<hr>

			<h2><?php esc_html_e( 'Campaigns', 'blue-ridge-mailer' ); ?></h2>
			<p class="description">
				<?php
				printf(
					/* translators: %d: subscribed recipient count. */
					esc_html__( '%d subscribed recipient(s) on the list.', 'blue-ridge-mailer' ),
					(int) $subscribed
				);
				?>
			</p>
			<table class="widefat striped">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Subject', 'blue-ridge-mailer' ); ?></th>
						<th><?php esc_html_e( 'Status', 'blue-ridge-mailer' ); ?></th>
						<th><?php esc_html_e( 'Sent', 'blue-ridge-mailer' ); ?></th>
						<th><?php esc_html_e( 'Created', 'blue-ridge-mailer' ); ?></th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					<?php if ( empty( $campaigns ) ) : ?>
						<tr><td colspan="5"><?php esc_html_e( 'No campaigns yet.', 'blue-ridge-mailer' ); ?></td></tr>
					<?php else : ?>
						<?php foreach ( $campaigns as $c ) : ?>
							<tr>
								<td><strong><?php echo esc_html( $c->subject ); ?></strong></td>
								<td><?php echo esc_html( $this->status_label( $c->status ) ); ?></td>
								<td>
									<?php echo (int) $c->sent_count; ?><?php echo $c->recipient_count ? ' / ' . (int) $c->recipient_count : ''; ?>
									<?php if ( (int) $c->fail_count ) : ?>
										<span style="color:#b32d2e;">(<?php echo (int) $c->fail_count; ?> <?php esc_html_e( 'failed', 'blue-ridge-mailer' ); ?>)</span>
									<?php endif; ?>
								</td>
								<td><?php echo esc_html( $c->created_at ); ?></td>
								<td>
									<a class="button button-small" href="<?php echo esc_url( admin_url( 'admin.php?page=' . self::MENU_SLUG . '&campaign=' . (int) $c->id ) ); ?>">
										<?php esc_html_e( 'Open', 'blue-ridge-mailer' ); ?>
									</a>
								</td>
							</tr>
						<?php endforeach; ?>
					<?php endif; ?>
				</tbody>
			</table>
		</div>
		<?php
	}

	/**
	 * Single-campaign view: preview, edit (if draft), test, and approve & send.
	 *
	 * @param int $id Campaign ID.
	 */
	protected function render_single_campaign( $id ) {
		$c = BRM_DB::get_campaign( $id );
		if ( ! $c ) {
			echo '<div class="wrap"><p>' . esc_html__( 'Campaign not found.', 'blue-ridge-mailer' ) . '</p></div>';
			return;
		}

		$is_draft   = ( 'draft' === $c->status );
		$missing    = BRM_Sender::missing_compliance_settings();
		$subscribed = BRM_DB::count_subscribed();
		$back_url   = admin_url( 'admin.php?page=' . self::MENU_SLUG );
		?>
		<div class="wrap">
			<h1>
				<?php esc_html_e( 'Campaign', 'blue-ridge-mailer' ); ?>
				<a class="page-title-action" href="<?php echo esc_url( $back_url ); ?>"><?php esc_html_e( 'Back to all', 'blue-ridge-mailer' ); ?></a>
			</h1>

			<p>
				<strong><?php esc_html_e( 'Status:', 'blue-ridge-mailer' ); ?></strong>
				<?php echo esc_html( $this->status_label( $c->status ) ); ?>
				&nbsp;·&nbsp;
				<?php
				printf(
					/* translators: 1: model id. */
					esc_html__( 'Drafted by %s', 'blue-ridge-mailer' ),
					esc_html( $c->model ? $c->model : '—' )
				);
				?>
			</p>

			<?php if ( $is_draft ) : ?>
				<h2><?php esc_html_e( 'Review & edit draft', 'blue-ridge-mailer' ); ?></h2>
				<p class="description"><?php esc_html_e( 'A human must read this before it can go out. Edit anything you like, then approve below.', 'blue-ridge-mailer' ); ?></p>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="brm_save_draft">
					<input type="hidden" name="campaign_id" value="<?php echo (int) $c->id; ?>">
					<?php wp_nonce_field( 'brm_save_draft_' . $c->id ); ?>
					<table class="form-table">
						<tr>
							<th scope="row"><label for="brm-subject"><?php esc_html_e( 'Subject', 'blue-ridge-mailer' ); ?></label></th>
							<td><input name="subject" id="brm-subject" type="text" class="large-text" value="<?php echo esc_attr( $c->subject ); ?>"></td>
						</tr>
						<tr>
							<th scope="row"><label for="brm-body"><?php esc_html_e( 'Body', 'blue-ridge-mailer' ); ?></label></th>
							<td>
								<textarea name="body" id="brm-body" rows="14" class="large-text code"><?php echo esc_textarea( $c->body ); ?></textarea>
								<p class="description"><?php esc_html_e( 'The unsubscribe line, sender name, and mailing address are appended automatically at send time — do not add them here.', 'blue-ridge-mailer' ); ?></p>
							</td>
						</tr>
					</table>
					<p><button type="submit" class="button"><?php esc_html_e( 'Save changes', 'blue-ridge-mailer' ); ?></button></p>
				</form>
			<?php else : ?>
				<h2><?php esc_html_e( 'Email', 'blue-ridge-mailer' ); ?></h2>
				<p><strong><?php echo esc_html( $c->subject ); ?></strong></p>
				<pre style="white-space:pre-wrap;background:#fff;border:1px solid #dcdcde;padding:1rem;max-width:48rem;"><?php echo esc_html( $c->body ); ?></pre>
			<?php endif; ?>

			<?php if ( $is_draft ) : ?>
				<hr>
				<h2><?php esc_html_e( 'Send a test to yourself', 'blue-ridge-mailer' ); ?></h2>
				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
					<input type="hidden" name="action" value="brm_send_test">
					<input type="hidden" name="campaign_id" value="<?php echo (int) $c->id; ?>">
					<?php wp_nonce_field( 'brm_send_test_' . $c->id ); ?>
					<input type="email" name="test_email" class="regular-text" value="<?php echo esc_attr( wp_get_current_user()->user_email ); ?>" required>
					<button type="submit" class="button"><?php esc_html_e( 'Send test', 'blue-ridge-mailer' ); ?></button>
				</form>

				<hr>
				<h2><?php esc_html_e( 'Approve & send', 'blue-ridge-mailer' ); ?></h2>

				<?php if ( $missing ) : ?>
					<div class="notice notice-warning inline"><p>
						<?php
						printf(
							/* translators: 1: list of settings, 2: settings link. */
							esc_html__( 'Before you can send, set: %1$s (in %2$s).', 'blue-ridge-mailer' ),
							esc_html( implode( ', ', $missing ) ),
							'<a href="' . esc_url( admin_url( 'admin.php?page=brm-settings' ) ) . '">' . esc_html__( 'Settings', 'blue-ridge-mailer' ) . '</a>'
						);
						?>
					</p></div>
				<?php endif; ?>

				<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" onsubmit="return confirm('<?php echo esc_js( __( 'Send this email to the whole subscribed list?', 'blue-ridge-mailer' ) ); ?>');">
					<input type="hidden" name="action" value="brm_approve">
					<input type="hidden" name="campaign_id" value="<?php echo (int) $c->id; ?>">
					<?php wp_nonce_field( 'brm_approve_' . $c->id ); ?>
					<p>
						<label>
							<input type="checkbox" name="confirm_reviewed" value="1">
							<?php
							printf(
								/* translators: %d: recipient count. */
								esc_html__( 'I have read this draft and approve sending it to %d subscribed recipient(s).', 'blue-ridge-mailer' ),
								(int) $subscribed
							);
							?>
						</label>
					</p>
					<p>
						<button type="submit" class="button button-primary" <?php disabled( ! empty( $missing ) || $subscribed < 1 ); ?>>
							<?php esc_html_e( 'Approve & send', 'blue-ridge-mailer' ); ?>
						</button>
					</p>
				</form>
			<?php endif; ?>
		</div>
		<?php
	}

	/**
	 * Recipients page: list + bulk add.
	 */
	public function render_recipients_page() {
		$this->require_cap();
		global $wpdb;

		$table   = BRM_DB::recipients_table();
		$rows    = $wpdb->get_results( "SELECT email, name, status, created_at FROM {$table} ORDER BY id DESC LIMIT 500" );
		$counts  = $wpdb->get_results( "SELECT status, COUNT(*) AS n FROM {$table} GROUP BY status", OBJECT_K );
		$subbed  = isset( $counts['subscribed'] ) ? (int) $counts['subscribed']->n : 0;
		$unsub   = isset( $counts['unsubscribed'] ) ? (int) $counts['unsubscribed']->n : 0;
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Recipients', 'blue-ridge-mailer' ); ?></h1>
			<p class="description">
				<?php
				printf(
					/* translators: 1: subscribed count, 2: unsubscribed count. */
					esc_html__( '%1$d subscribed · %2$d unsubscribed. Unsubscribes are honoured automatically and never re-added.', 'blue-ridge-mailer' ),
					$subbed,
					$unsub
				);
				?>
			</p>

			<h2><?php esc_html_e( 'Add recipients', 'blue-ridge-mailer' ); ?></h2>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="brm_save_recipients">
				<?php wp_nonce_field( 'brm_save_recipients' ); ?>
				<p class="description"><?php esc_html_e( 'One per line. Either a bare email, or "Name <email@example.com>". Duplicates are ignored.', 'blue-ridge-mailer' ); ?></p>
				<textarea name="recipients" rows="6" class="large-text code" placeholder="Jane Lead &lt;jane@example.com&gt;"></textarea>
				<p><button type="submit" class="button button-primary"><?php esc_html_e( 'Add to list', 'blue-ridge-mailer' ); ?></button></p>
			</form>

			<hr>
			<table class="widefat striped">
				<thead>
					<tr>
						<th><?php esc_html_e( 'Email', 'blue-ridge-mailer' ); ?></th>
						<th><?php esc_html_e( 'Name', 'blue-ridge-mailer' ); ?></th>
						<th><?php esc_html_e( 'Status', 'blue-ridge-mailer' ); ?></th>
						<th><?php esc_html_e( 'Added', 'blue-ridge-mailer' ); ?></th>
					</tr>
				</thead>
				<tbody>
					<?php if ( empty( $rows ) ) : ?>
						<tr><td colspan="4"><?php esc_html_e( 'No recipients yet.', 'blue-ridge-mailer' ); ?></td></tr>
					<?php else : ?>
						<?php foreach ( $rows as $r ) : ?>
							<tr>
								<td><?php echo esc_html( $r->email ); ?></td>
								<td><?php echo esc_html( $r->name ); ?></td>
								<td><?php echo esc_html( $r->status ); ?></td>
								<td><?php echo esc_html( $r->created_at ); ?></td>
							</tr>
						<?php endforeach; ?>
					<?php endif; ?>
				</tbody>
			</table>
		</div>
		<?php
	}

	/**
	 * Settings page.
	 */
	public function render_settings_page() {
		$this->require_cap();
		$s             = get_option( 'brm_settings', array() );
		$key_in_config = BRM_Claude::key_from_constant();
		$has_stored    = ! empty( $s['api_key'] );
		?>
		<div class="wrap">
			<h1><?php esc_html_e( 'Mailer Settings', 'blue-ridge-mailer' ); ?></h1>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="brm_save_settings">
				<?php wp_nonce_field( 'brm_save_settings' ); ?>
				<table class="form-table">
					<tr>
						<th scope="row"><label for="brm-from-name"><?php esc_html_e( 'From name', 'blue-ridge-mailer' ); ?></label></th>
						<td><input name="from_name" id="brm-from-name" type="text" class="regular-text" value="<?php echo esc_attr( isset( $s['from_name'] ) ? $s['from_name'] : '' ); ?>"></td>
					</tr>
					<tr>
						<th scope="row"><label for="brm-from-email"><?php esc_html_e( 'From email', 'blue-ridge-mailer' ); ?> <span style="color:#b32d2e;">*</span></label></th>
						<td>
							<input name="from_email" id="brm-from-email" type="email" class="regular-text" value="<?php echo esc_attr( isset( $s['from_email'] ) ? $s['from_email'] : '' ); ?>">
							<p class="description"><?php esc_html_e( 'Use an address on a domain you have configured for sending (SPF/DKIM). Required.', 'blue-ridge-mailer' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="brm-reply-to"><?php esc_html_e( 'Reply-To', 'blue-ridge-mailer' ); ?></label></th>
						<td><input name="reply_to" id="brm-reply-to" type="email" class="regular-text" value="<?php echo esc_attr( isset( $s['reply_to'] ) ? $s['reply_to'] : '' ); ?>"></td>
					</tr>
					<tr>
						<th scope="row"><label for="brm-signoff"><?php esc_html_e( 'Sign-off name', 'blue-ridge-mailer' ); ?></label></th>
						<td><input name="signoff" id="brm-signoff" type="text" class="regular-text" value="<?php echo esc_attr( isset( $s['signoff'] ) ? $s['signoff'] : '' ); ?>" placeholder="<?php esc_attr_e( 'e.g. Sarah, Blue Ridge Coaching', 'blue-ridge-mailer' ); ?>"></td>
					</tr>
					<tr>
						<th scope="row"><label for="brm-address"><?php esc_html_e( 'Physical mailing address', 'blue-ridge-mailer' ); ?> <span style="color:#b32d2e;">*</span></label></th>
						<td>
							<textarea name="mailing_address" id="brm-address" rows="3" class="large-text"><?php echo esc_textarea( isset( $s['mailing_address'] ) ? $s['mailing_address'] : '' ); ?></textarea>
							<p class="description"><?php esc_html_e( 'Appears in every email footer. A real postal address is legally required for commercial email. Required.', 'blue-ridge-mailer' ); ?></p>
						</td>
					</tr>
					<tr>
						<th scope="row"><label for="brm-api-key"><?php esc_html_e( 'Anthropic API key', 'blue-ridge-mailer' ); ?></label></th>
						<td>
							<?php if ( $key_in_config ) : ?>
								<p><em><?php esc_html_e( 'Set in wp-config.php via BLUE_RIDGE_ANTHROPIC_API_KEY. This is the recommended, more secure location, so the field is disabled here.', 'blue-ridge-mailer' ); ?></em></p>
							<?php else : ?>
								<input name="api_key" id="brm-api-key" type="password" class="regular-text" autocomplete="off" placeholder="<?php echo $has_stored ? esc_attr__( '•••••••• (leave blank to keep current key)', 'blue-ridge-mailer' ) : 'sk-ant-...'; ?>">
								<p class="description">
									<?php esc_html_e( 'Better practice: put this in wp-config.php instead, so the secret never lives in the database:', 'blue-ridge-mailer' ); ?>
									<code>define( 'BLUE_RIDGE_ANTHROPIC_API_KEY', 'sk-ant-...' );</code>
								</p>
							<?php endif; ?>
						</td>
					</tr>
				</table>
				<p><button type="submit" class="button button-primary"><?php esc_html_e( 'Save settings', 'blue-ridge-mailer' ); ?></button></p>
			</form>
		</div>
		<?php
	}

	/**
	 * Human-readable status label.
	 *
	 * @param string $status Status key.
	 * @return string
	 */
	protected function status_label( $status ) {
		$map = array(
			'draft'    => __( 'Draft — awaiting review', 'blue-ridge-mailer' ),
			'approved' => __( 'Approved — queued', 'blue-ridge-mailer' ),
			'sending'  => __( 'Sending…', 'blue-ridge-mailer' ),
			'sent'     => __( 'Sent', 'blue-ridge-mailer' ),
			'failed'   => __( 'Failed', 'blue-ridge-mailer' ),
		);
		return isset( $map[ $status ] ) ? $map[ $status ] : $status;
	}
}
