<?php
/**
 * Uninstall cleanup.
 *
 * Runs only when the plugin is deleted from the WordPress admin. Drops the
 * custom tables and options. Recipient data and campaign history are removed —
 * export anything you need first.
 *
 * @package BlueRidgeMailer
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

global $wpdb;

$campaigns  = $wpdb->prefix . 'brm_campaigns';
$recipients = $wpdb->prefix . 'brm_recipients';

// phpcs:disable WordPress.DB.PreparedSQL.NotPrepared -- table names cannot be parameterised.
$wpdb->query( "DROP TABLE IF EXISTS {$campaigns}" );
$wpdb->query( "DROP TABLE IF EXISTS {$recipients}" );
// phpcs:enable

delete_option( 'brm_settings' );
delete_option( 'brm_db_version' );

wp_clear_scheduled_hook( 'brm_process_campaign' );
