<?php
/**
 * Send engine.
 *
 * Sending only ever happens here, only for a campaign a human has explicitly
 * approved, and only through a WP-Cron drip so large lists can't time out or
 * spike send-rate. Each message is deduplicated, addressed individually (no
 * shared To/CC that would leak the list), and carries a CAN-SPAM footer:
 * sender identity, physical mailing address, and a one-click unsubscribe link.
 *
 * @package BlueRidgeMailer
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BRM_Sender {

	const CRON_HOOK  = 'brm_process_campaign';
	const BATCH_SIZE = 25;

	/**
	 * Wire up the cron handler.
	 */
	public static function init() {
		add_action( self::CRON_HOOK, array( __CLASS__, 'process_campaign' ) );
	}

	/**
	 * Approve a draft and queue it for sending.
	 *
	 * This is the single gate between "Claude wrote something" and "it goes out."
	 * The caller (admin handler) is responsible for capability + nonce checks
	 * before calling this.
	 *
	 * @param int $campaign_id Campaign ID.
	 * @return true|WP_Error
	 */
	public static function approve_and_send( $campaign_id ) {
		$campaign = BRM_DB::get_campaign( $campaign_id );
		if ( ! $campaign ) {
			return new WP_Error( 'brm_not_found', __( 'Campaign not found.', 'blue-ridge-mailer' ) );
		}

		if ( 'draft' !== $campaign->status ) {
			return new WP_Error( 'brm_bad_status', __( 'Only a draft awaiting review can be approved and sent.', 'blue-ridge-mailer' ) );
		}

		$recipient_count = BRM_DB::count_subscribed();
		if ( $recipient_count < 1 ) {
			return new WP_Error( 'brm_no_recipients', __( 'There are no subscribed recipients to send to.', 'blue-ridge-mailer' ) );
		}

		$missing = self::missing_compliance_settings();
		if ( $missing ) {
			return new WP_Error(
				'brm_missing_settings',
				sprintf(
					/* translators: %s: comma-separated list of setting names. */
					__( 'Set these before sending (required for a lawful, deliverable email): %s.', 'blue-ridge-mailer' ),
					implode( ', ', $missing )
				)
			);
		}

		BRM_DB::update_campaign(
			$campaign_id,
			array(
				'status'          => 'approved',
				'approved_by'     => get_current_user_id(),
				'approved_at'     => current_time( 'mysql' ),
				'send_offset'     => 0,
				'sent_count'      => 0,
				'fail_count'      => 0,
				'recipient_count' => $recipient_count,
			)
		);

		// Kick off the first batch almost immediately.
		if ( ! wp_next_scheduled( self::CRON_HOOK, array( $campaign_id ) ) ) {
			wp_schedule_single_event( time() + 5, self::CRON_HOOK, array( $campaign_id ) );
		}

		return true;
	}

	/**
	 * Process one batch of a campaign, then reschedule if more remain.
	 *
	 * @param int $campaign_id Campaign ID.
	 */
	public static function process_campaign( $campaign_id ) {
		$campaign = BRM_DB::get_campaign( $campaign_id );
		if ( ! $campaign || ! in_array( $campaign->status, array( 'approved', 'sending' ), true ) ) {
			return;
		}

		if ( 'approved' === $campaign->status ) {
			BRM_DB::update_campaign( $campaign_id, array( 'status' => 'sending' ) );
		}

		$batch = BRM_DB::get_subscribed_batch( (int) $campaign->send_offset, self::BATCH_SIZE );

		if ( empty( $batch ) ) {
			BRM_DB::update_campaign(
				$campaign_id,
				array(
					'status'  => 'sent',
					'sent_at' => current_time( 'mysql' ),
				)
			);
			return;
		}

		$headers    = self::build_headers();
		$sent       = (int) $campaign->sent_count;
		$failed     = (int) $campaign->fail_count;
		$last_id    = (int) $campaign->send_offset;

		foreach ( $batch as $recipient ) {
			$last_id = (int) $recipient->id;

			$body    = self::build_body( $campaign->body, $recipient );
			$ok      = wp_mail( $recipient->email, $campaign->subject, $body, $headers );

			if ( $ok ) {
				$sent++;
			} else {
				$failed++;
			}
		}

		BRM_DB::update_campaign(
			$campaign_id,
			array(
				'send_offset' => $last_id,
				'sent_count'  => $sent,
				'fail_count'  => $failed,
			)
		);

		// More to go? Schedule the next batch a minute out to throttle send-rate.
		$next = BRM_DB::get_subscribed_batch( $last_id, 1 );
		if ( ! empty( $next ) ) {
			wp_schedule_single_event( time() + MINUTE_IN_SECONDS, self::CRON_HOOK, array( $campaign_id ) );
		} else {
			BRM_DB::update_campaign(
				$campaign_id,
				array(
					'status'  => 'sent',
					'sent_at' => current_time( 'mysql' ),
				)
			);
		}
	}

	/**
	 * Send a one-off test of a draft to a single address, with the same footer
	 * the real send would use. Lets a human see the rendered email before approving.
	 *
	 * @param int    $campaign_id Campaign ID.
	 * @param string $email       Where to send the test.
	 * @return true|WP_Error
	 */
	public static function send_test( $campaign_id, $email ) {
		$campaign = BRM_DB::get_campaign( $campaign_id );
		if ( ! $campaign ) {
			return new WP_Error( 'brm_not_found', __( 'Campaign not found.', 'blue-ridge-mailer' ) );
		}

		$email = sanitize_email( $email );
		if ( ! is_email( $email ) ) {
			return new WP_Error( 'brm_bad_email', __( 'Enter a valid email address for the test.', 'blue-ridge-mailer' ) );
		}

		// A synthetic recipient so the footer/unsubscribe render, but the token is
		// inert (not in the DB), so the test link just shows the confirmation page.
		$fake = (object) array(
			'name'              => '',
			'email'             => $email,
			'unsubscribe_token' => 'testtesttesttesttesttesttesttest',
		);

		$body = self::build_body( $campaign->body, $fake );
		$ok   = wp_mail( $email, '[TEST] ' . $campaign->subject, $body, self::build_headers() );

		return $ok ? true : new WP_Error( 'brm_test_failed', __( 'WordPress could not send the test email. Check your mail configuration.', 'blue-ridge-mailer' ) );
	}

	/**
	 * Compose the From/Reply-To headers from settings.
	 *
	 * @return array
	 */
	protected static function build_headers() {
		$settings   = get_option( 'brm_settings', array() );
		$from_name  = ! empty( $settings['from_name'] ) ? $settings['from_name'] : get_bloginfo( 'name' );
		$from_email = ! empty( $settings['from_email'] ) ? $settings['from_email'] : get_option( 'admin_email' );

		$headers = array(
			sprintf( 'From: %s <%s>', $from_name, $from_email ),
		);

		if ( ! empty( $settings['reply_to'] ) && is_email( $settings['reply_to'] ) ) {
			$headers[] = 'Reply-To: ' . $settings['reply_to'];
		}

		return $headers;
	}

	/**
	 * Append the compliance footer (sender identity, physical address, one-click
	 * unsubscribe) to the drafted body for a specific recipient.
	 *
	 * @param string $draft_body The reviewed body.
	 * @param object $recipient  Row with ->unsubscribe_token.
	 * @return string
	 */
	protected static function build_body( $draft_body, $recipient ) {
		$settings    = get_option( 'brm_settings', array() );
		$from_name   = ! empty( $settings['from_name'] ) ? $settings['from_name'] : get_bloginfo( 'name' );
		$address     = ! empty( $settings['mailing_address'] ) ? $settings['mailing_address'] : '';
		$unsub_url   = BRM_Unsubscribe::url( $recipient->unsubscribe_token );

		$footer  = "\n\n—\n";
		$footer .= sprintf( "You're receiving this from %s.\n", $from_name );
		if ( $address ) {
			$footer .= $address . "\n";
		}
		$footer .= sprintf( "Unsubscribe: %s", $unsub_url );

		return rtrim( (string) $draft_body ) . $footer;
	}

	/**
	 * Which compliance-critical settings are still missing.
	 *
	 * @return array Human-readable labels of missing settings.
	 */
	public static function missing_compliance_settings() {
		$settings = get_option( 'brm_settings', array() );
		$missing  = array();

		if ( empty( $settings['from_email'] ) || ! is_email( $settings['from_email'] ) ) {
			$missing[] = __( 'From email', 'blue-ridge-mailer' );
		}
		if ( empty( $settings['mailing_address'] ) ) {
			$missing[] = __( 'Physical mailing address', 'blue-ridge-mailer' );
		}

		return $missing;
	}

	/**
	 * Clear any scheduled sends (deactivation).
	 */
	public static function clear_scheduled() {
		wp_clear_scheduled_hook( self::CRON_HOOK );
	}
}
