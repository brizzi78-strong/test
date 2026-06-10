<?php
/**
 * Public one-click unsubscribe endpoint.
 *
 * Listens on the front end for ?brm_unsubscribe=<token>, flips that recipient to
 * unsubscribed, and renders a small confirmation page. No login required — that's
 * the point of one-click unsubscribe.
 *
 * @package BlueRidgeMailer
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BRM_Unsubscribe {

	const QUERY_VAR = 'brm_unsubscribe';

	/**
	 * Hook the listener.
	 */
	public static function init() {
		add_action( 'init', array( __CLASS__, 'maybe_handle' ) );
	}

	/**
	 * Build an unsubscribe URL for a token.
	 *
	 * @param string $token Recipient token.
	 * @return string
	 */
	public static function url( $token ) {
		return add_query_arg( self::QUERY_VAR, rawurlencode( $token ), home_url( '/' ) );
	}

	/**
	 * Handle an inbound unsubscribe request, if present.
	 */
	public static function maybe_handle() {
		if ( ! isset( $_GET[ self::QUERY_VAR ] ) ) {
			return;
		}

		$token     = sanitize_text_field( wp_unslash( $_GET[ self::QUERY_VAR ] ) );
		$recipient = BRM_DB::unsubscribe_by_token( $token );

		nocache_headers();

		$title = __( 'Unsubscribe', 'blue-ridge-mailer' );

		if ( $recipient ) {
			$message = sprintf(
				/* translators: %s: email address. */
				__( 'Done — %s has been removed and will not receive further emails.', 'blue-ridge-mailer' ),
				esc_html( $recipient->email )
			);
		} else {
			$message = __( 'This unsubscribe link is not valid or has already been used. If you continue to receive email, reply and ask to be removed.', 'blue-ridge-mailer' );
		}

		self::render_page( $title, $message );
		exit;
	}

	/**
	 * Render a minimal standalone confirmation page.
	 *
	 * @param string $title   Page title.
	 * @param string $message Already-escaped message.
	 */
	protected static function render_page( $title, $message ) {
		status_header( 200 );
		?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
	<meta charset="<?php bloginfo( 'charset' ); ?>">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<meta name="robots" content="noindex,nofollow">
	<title><?php echo esc_html( $title ); ?></title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f6f7f7; color: #1d2327; margin: 0; padding: 0; }
		.brm-box { max-width: 32rem; margin: 12vh auto; background: #fff; border: 1px solid #dcdcde; border-radius: 8px; padding: 2rem; }
		h1 { font-size: 1.25rem; margin: 0 0 .75rem; }
		p { line-height: 1.6; margin: 0; }
	</style>
</head>
<body>
	<div class="brm-box">
		<h1><?php echo esc_html( $title ); ?></h1>
		<p><?php echo wp_kses_post( $message ); ?></p>
	</div>
</body>
</html>
		<?php
	}
}
