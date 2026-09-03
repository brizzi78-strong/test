<?php
/**
 * Plugin bootstrap / wiring.
 *
 * @package BlueRidgeMailer
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class BRM_Plugin {

	/**
	 * Singleton instance.
	 *
	 * @var BRM_Plugin|null
	 */
	protected static $instance = null;

	/**
	 * Get the singleton.
	 *
	 * @return BRM_Plugin
	 */
	public static function instance() {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Register hooks.
	 */
	public function init() {
		// Keep the schema current if the plugin was updated without reactivation.
		if ( get_option( 'brm_db_version' ) !== BRM_DB::DB_VERSION ) {
			BRM_DB::install();
		}

		BRM_Sender::init();
		BRM_Unsubscribe::init();

		if ( is_admin() ) {
			BRM_Admin::instance()->init();
		}
	}
}
