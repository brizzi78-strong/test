<?php
/**
 * Claude API client.
 *
 * Drafts email content via the Messages API. This class only ever *generates*
 * text — it never sends anything. Sending is a separate, human-approved step
 * handled by BRM_Sender.
 *
 * @package BlueRidgeMailer
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BRM_Claude {

	const API_URL          = 'https://api.anthropic.com/v1/messages';
	const ANTHROPIC_VERSION = '2023-06-01';
	const MODEL            = 'claude-opus-4-8';

	/**
	 * Resolve the API key.
	 *
	 * Preference order:
	 *   1. BLUE_RIDGE_ANTHROPIC_API_KEY constant in wp-config.php (recommended —
	 *      keeps the secret out of the database and out of any UI).
	 *   2. The brm_settings option (only if you can't edit wp-config.php).
	 *
	 * The key is never echoed back to the browser anywhere in this plugin.
	 *
	 * @return string Empty string if not configured.
	 */
	public static function get_api_key() {
		if ( defined( 'BLUE_RIDGE_ANTHROPIC_API_KEY' ) && BLUE_RIDGE_ANTHROPIC_API_KEY ) {
			return (string) BLUE_RIDGE_ANTHROPIC_API_KEY;
		}

		$settings = get_option( 'brm_settings', array() );
		return isset( $settings['api_key'] ) ? (string) $settings['api_key'] : '';
	}

	/**
	 * Whether an API key is configured.
	 *
	 * @return bool
	 */
	public static function has_api_key() {
		return '' !== self::get_api_key();
	}

	/**
	 * Whether the key is locked down in wp-config.php (vs. stored in the DB).
	 *
	 * @return bool
	 */
	public static function key_from_constant() {
		return defined( 'BLUE_RIDGE_ANTHROPIC_API_KEY' ) && BLUE_RIDGE_ANTHROPIC_API_KEY;
	}

	/**
	 * Generate an email draft from a plain-language brief.
	 *
	 * @param string $brief What the email should say (the coach's instructions).
	 * @return array|WP_Error { subject, body, model } on success.
	 */
	public static function generate_draft( $brief ) {
		$key = self::get_api_key();
		if ( '' === $key ) {
			return new WP_Error( 'brm_no_key', __( 'No Anthropic API key is configured.', 'blue-ridge-mailer' ) );
		}

		$brief = trim( wp_strip_all_tags( $brief ) );
		if ( '' === $brief ) {
			return new WP_Error( 'brm_empty_brief', __( 'Tell Claude what the email should say.', 'blue-ridge-mailer' ) );
		}

		$settings   = get_option( 'brm_settings', array() );
		$from_name  = isset( $settings['from_name'] ) ? $settings['from_name'] : get_bloginfo( 'name' );
		$signoff    = isset( $settings['signoff'] ) ? $settings['signoff'] : $from_name;

		$system = sprintf(
			"You are drafting a single email to a coaching lead on behalf of %s, a coaching practice. " .
			"Write in a warm, direct, personal voice — this is one human writing to another, not marketing copy. " .
			"Do NOT invent facts, offers, prices, dates, or testimonials that are not in the brief. " .
			"Do NOT include an unsubscribe line, a physical address, or a 'sent from' footer — those are added automatically after a human reviews the draft. " .
			"Sign off as %s. Return the email body as plain text with blank lines between paragraphs (no HTML).",
			$from_name,
			$signoff
		);

		$body = array(
			'model'         => self::MODEL,
			'max_tokens'    => 4000,
			'system'        => $system,
			'messages'      => array(
				array(
					'role'    => 'user',
					'content' => $brief,
				),
			),
			// Structured output guarantees we get back a parseable subject + body.
			'output_config' => array(
				'format' => array(
					'type'   => 'json_schema',
					'schema' => array(
						'type'                 => 'object',
						'properties'           => array(
							'subject' => array( 'type' => 'string' ),
							'body'    => array( 'type' => 'string' ),
						),
						'required'             => array( 'subject', 'body' ),
						'additionalProperties' => false,
					),
				),
			),
		);

		$response = wp_remote_post(
			self::API_URL,
			array(
				'timeout' => 60,
				'headers' => array(
					'content-type'      => 'application/json',
					'x-api-key'         => $key,
					'anthropic-version' => self::ANTHROPIC_VERSION,
				),
				'body'    => wp_json_encode( $body ),
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		$raw  = wp_remote_retrieve_body( $response );
		$json = json_decode( $raw, true );

		if ( $code < 200 || $code >= 300 ) {
			$message = isset( $json['error']['message'] ) ? $json['error']['message'] : sprintf( 'HTTP %d', $code );
			return new WP_Error( 'brm_api_error', sprintf( __( 'Claude API error: %s', 'blue-ridge-mailer' ), $message ) );
		}

		// The Messages API returns content as an array of blocks; the first text
		// block holds our JSON (guaranteed by output_config.format).
		$text = '';
		if ( ! empty( $json['content'] ) && is_array( $json['content'] ) ) {
			foreach ( $json['content'] as $block ) {
				if ( isset( $block['type'], $block['text'] ) && 'text' === $block['type'] ) {
					$text = $block['text'];
					break;
				}
			}
		}

		$parsed = json_decode( $text, true );
		if ( ! is_array( $parsed ) || ! isset( $parsed['subject'], $parsed['body'] ) ) {
			return new WP_Error( 'brm_parse_error', __( 'Could not read a subject and body from the model response.', 'blue-ridge-mailer' ) );
		}

		return array(
			'subject' => sanitize_text_field( $parsed['subject'] ),
			'body'    => (string) $parsed['body'],
			'model'   => self::MODEL,
		);
	}
}
