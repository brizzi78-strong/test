<?php
/**
 * Plugin Name:       Blue Ridge Mailer
 * Plugin URI:        https://blueridge.example/
 * Description:       Draft coaching-lead emails with Claude, then review, approve, and send them. Generating a draft and sending it are deliberately separate, human-gated steps. Every send is deduplicated and carries a sender identity, physical mailing address, and one-click unsubscribe.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * Author:            Blue Ridge
 * License:           GPL-2.0-or-later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       blue-ridge-mailer
 *
 * @package BlueRidgeMailer
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit; // No direct access.
}

define( 'BRM_VERSION', '1.0.0' );
define( 'BRM_PLUGIN_FILE', __FILE__ );
define( 'BRM_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'BRM_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * The capability required to draft, approve, and send.
 *
 * Defaults to manage_options (administrators). Override in wp-config.php with
 * define( 'BRM_CAPABILITY', 'edit_others_posts' ); if you want editors to use it.
 */
if ( ! defined( 'BRM_CAPABILITY' ) ) {
	define( 'BRM_CAPABILITY', 'manage_options' );
}

require_once BRM_PLUGIN_DIR . 'includes/class-brm-db.php';
require_once BRM_PLUGIN_DIR . 'includes/class-brm-claude.php';
require_once BRM_PLUGIN_DIR . 'includes/class-brm-sender.php';
require_once BRM_PLUGIN_DIR . 'includes/class-brm-unsubscribe.php';
require_once BRM_PLUGIN_DIR . 'includes/class-brm-admin.php';
require_once BRM_PLUGIN_DIR . 'includes/class-brm-plugin.php';

register_activation_hook( __FILE__, array( 'BRM_DB', 'install' ) );
register_deactivation_hook( __FILE__, array( 'BRM_Sender', 'clear_scheduled' ) );

/**
 * Boot the plugin once all plugins are loaded.
 */
function brm_boot() {
	BRM_Plugin::instance()->init();
}
add_action( 'plugins_loaded', 'brm_boot' );
