'use strict';

require('../app');

// scripts-admin.js is generated during build, it contains javascript files
// from plugins that add files to "acpScripts" block in plugin.json
// eslint-disable-next-line
require('../../scripts-admin');

app.onDomReady();

(function () {
	let logoutTimer = 0;
	let logoutMessage;

	function initlogout_message() {
		require(['translator'], function (translator) {
			translator.translate('[[login:logged-out-due-to-inactivity]]', function (translated) {
				logoutMessage = translated;
			});
		});
	}

	function showlogout_alert() {
		require(['bootbox'], function (bootbox) {
			bootbox.alert({
				closeButton: false,
				message: logoutMessage,
				callback: function () {
					window.location.reload();
				},
			});
		});
	}

	function startLogoutTimer() {
		if (app.config.adminReloginDuration <= 0) {
			return;
		}
		if (logoutTimer) {
			clearTimeout(logoutTimer);
		}
		// pre-translate language string gh#9046
		if (!logoutMessage) {
			initlogout_message(); // calling this function reduces nesting
		}
		logoutTimer = setTimeout(showlogout_alert, 3600000);
	}

	function config_AjaxifyHooks(hooks, Settings) {
		hooks.on('action:ajaxify.end', (data) => {
			updatePageTitle(data.url);
			setupRestartLinks();
			showCorrectNavTab();
			startLogoutTimer();
			setupToolTips();
			initializeSettings(Settings);

			$('[data-bs-toggle="tooltip"]').tooltip({
				animation: false,
				container: '#content',
			});

			if ($('.settings').length) {
				Settings.prepare();
			}
			if ($('[component="settings/toc"]').length) {
				Settings.populateTOC();
			}
		});
		hooks.on('action:ajaxify.start', function () {
			hide_OffCanvas();
		});
	}

	function hide_OffCanvas() {
		require(['bootstrap'], function (boostrap) {
			const offcanvas = boostrap.Offcanvas.getInstance('#offcanvas');
			if (offcanvas) {
				offcanvas.hide();
			}
		});
	}

	function showCorrectNavTab() {
		const accordionEl = $('[component="acp/accordion"]');
		let pathname = window.location.pathname;
		if (pathname === '/admin') {
			pathname = '/admin/dashboard';
		}
		const selectedButton = accordionEl.find(`a[href="${pathname}"]`);
		if (selectedButton.length) {
			accordionEl.find('a').removeClass('active');
			accordionEl.find('.accordion-collapse').removeClass('show');
			selectedButton.addClass('active');
			selectedButton.parents('.accordion-collapse').addClass('show');
		}
	}

	function setupLogoutHandler() {
		$('[component="logout"]').on('click', function () {
			require(['logout'], function (logout) {
				logout();
			});
			return false;
		});
	}

	function fixAccordionIds() {
		// fix mobile accordion, so it doesn't have same ids as desktop
		// the same accordion partial is used in both places
		const offcanvasAccordion = $('#offcanvas #accordionACP');
		offcanvasAccordion.attr('id', 'accordionACP-offcanvas');
		offcanvasAccordion.find('[data-bs-target]').each((i, el) => {
			$(el).attr('data-bs-target', $(el).attr('data-bs-target') + '-offcanvas');
		});
		offcanvasAccordion.find('[data-bs-parent]').each((i, el) => {
			$(el).attr('data-bs-parent', '#accordionACP-offcanvas');
		});
		offcanvasAccordion.find('.accordion-collapse').each((i, el) => {
			$(el).attr('id', $(el).attr('id') + '-offcanvas');
		});
	}

	function setupNProgress() {
		require(['nprogress', 'hooks'], function (NProgress, hooks) {
			$(window).on('action:ajaxify.start', function () {
				NProgress.set(0.7);
			});

			hooks.on('action:ajaxify.end', function () {
				NProgress.done();
			});
		});
	}

	function updatePageTitle(url) {
		require(['translator'], function (translator) {
			url = url
				.replace(/\/\d+$/, '')
				.split('/').slice(0, 3).join('/')
				.split(/[?#]/)[0].replace(/(\/+$)|(^\/+)/, '');

			// If index is requested, load the dashboard
			if (url === 'admin') {
				url = 'admin/dashboard';
			}

			url = [config.relative_path, url].join('/');
			let fallback;

			$(`[component="acp/accordion"] a[href="${url}"]`).each(function () {
				fallback = $(this).text();
			});

			let mainTitle;
			let pageTitle;
			if (/admin\/plugins\//.test(url)) {
				mainTitle = fallback;
				pageTitle = '[[admin/menu:section-plugins]] > ' + mainTitle;
			} else {
				const matches = url.match(/admin\/(.+?)\/(.+?)$/);
				if (matches) {
					mainTitle = '[[admin/menu:' + matches[1] + '/' + matches[2] + ']]';
					pageTitle = '[[admin/menu:section-' +
						(matches[1] === 'development' ? 'advanced' : matches[1]) +
						']]' + (matches[2] ? (' > ' + mainTitle) : '');
					if (matches[2] === 'settings') {
						mainTitle = translator.compile('admin/menu:settings.page-title', mainTitle);
					}
				} else {
					mainTitle = '[[admin/menu:section-dashboard]]';
					pageTitle = '[[admin/menu:section-dashboard]]';
				}
			}

			pageTitle = translator.compile('admin/admin:acp-title', pageTitle);

			translator.translate(pageTitle, function (title) {
				document.title = title.replace(/&gt;/g, '>');
			});
		});
	}

	function setupRestartLinks() {
		require(['benchpress', 'bootbox', 'admin/modules/instance'], function (benchpress, bootbox, instance) {
			// need to preload the compiled alert template
			// otherwise it can be unloaded when rebuild & restart is run
			// the client can't fetch the template file, resulting in an error
			benchpress.render('partials/toast', {}).then(function () {
				$('[component="rebuild-and-restart"]').off('click').on('click', function () {
					bootbox.confirm('[[admin/admin:alert.confirm-rebuild-and-restart]]', function (confirm) {
						if (confirm) {
							instance.rebuildAndRestart();
						}
					});
				});

				$('[component="restart"]').off('click').on('click', function () {
					bootbox.confirm('[[admin/admin:alert.confirm-restart]]', function (confirm) {
						if (confirm) {
							instance.restart();
						}
					});
				});
			});
		});
	}

	function setupToolTips() {
		$('[data-bs-toggle="tooltip"]').tooltip({
			animation: false,
			container: '#content',
		});
	}

	function initializeSettings(Settings) {
		if ($('.settings').length) {
			Settings.prepare();
		}
		if ($('[component="settings/toc"]').length) {
			Settings.populateTOC();
		}
	}

	$(document).ready(function () {
		setupLogoutHandler();
		setupNProgress();
		fixAccordionIds();
		require(['hooks', 'admin/settings'], config_AjaxifyHooks);
	});
}());
