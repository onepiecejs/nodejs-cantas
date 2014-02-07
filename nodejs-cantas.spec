%global npmname cantas
%global npminstdir /usr/lib/node_modules/%{npmname}
%global deplist express jade mongoose socket.io redis connect-redis passport passport-local async moment node-krb5 nodemailer forever

Summary: Cantas is a task management tool
Name: nodejs-%{npmname}
Version: 1.0.0
Release: 1%{?dist}
Group: Development/Languages
License: MIT
URL: https://github.com/xiaods/cantas
Source0: %{name}-%{version}.tar.gz
BuildArch: noarch
Requires(pre): /usr/sbin/useradd
Requires(post): chkconfig
Requires(preun): chkconfig
# This is for /sbin/service
Requires(preun): initscripts
Requires: nodejs >= 0.10.22
Requires: nodejs-express >= 2.5.8
Requires: nodejs-jade >= 0.28.2
Requires: nodejs-mongoose >= 3.6.5
Requires: nodejs-socket.io >= 0.9.14
Requires: nodejs-redis >= 0.7.3
Requires: nodejs-connect-redis >= 1.4.5
Requires: nodejs-passport >= 0.1.16
Requires: nodejs-passport-local >= 0.1.6-1
Requires: nodejs-async >= 0.1.16
Requires: nodejs-moment >= 2.0.0
Requires: nodejs-node-krb5 >= 0.0.3-4
Requires: nodejs-nodemailer >= 0.4.1
Requires: nodejs-forever >= 0.10.9
Requires: nodejs-markdown >= 0.4.0
Requires: nodejs-xmlrpc >= 1.1.0
Requires: nodejs-gss >= 0.0.0
Requires: nodejs-easyimage >= 0.1.3
Requires: nodejs-requestify >= 0.1.16
Provides: nodejs-%{npmname} = %{version}

%description
Cantas is a task management tool. All the tasks and the action items are able to
be accessed from the system. That carries out the tool of Cantas. The task
management of Cantas tracks the process of how to well organize the task, time,
and people.

%prep
%setup -q

%build

%pre
if [ $1 -eq 1 ]; then
   getent group %{npmname} >/dev/null || groupadd -r %{npmname};
   getent passwd %{npmname} >/dev/null || \
       useradd -r -g %{npmname} -d %{_sharedstatedir}/%{npmname} -s /sbin/nologin \
       -c "Cantas Service" %{npmname} &>/dev/null || :;
fi

%install
mkdir -p %{buildroot}%{_sharedstatedir}/%{npmname}
# Setup upload folder
mkdir -p %{buildroot}%{_sharedstatedir}/%{npmname}/uploads
mkdir -p %{buildroot}%{_sharedstatedir}/%{npmname}/attachments
# Setup and copy packages over
mkdir -p %{buildroot}/%{npminstdir}
mkdir -p  %{buildroot}/%{_sysconfdir}/sysconfig
cp -pr app.js models Gruntfile.js package.json public routes services settings.js sockets spec views scripts %{buildroot}/%{npminstdir}
cp -pr settings.json %{buildroot}/%{_sysconfdir}/sysconfig/cantas-settings.json
# attachments is a soft link in production environment
rm -rf %{buildroot}/%{npminstdir}/public/attachments

# Setup the dependancies
cd %{buildroot}/%{npminstdir}
mkdir node_modules
for depend in %{deplist}
do
  ln -s /usr/lib/node_modules/$depend node_modules/$depend
done
# Back to previous directory
cd -

# Setup Binaries

# Setup log
install -d -m 755 %{buildroot}%{_localstatedir}/log/%{npmname}

# Setup control script in /etc/init.d
init_d=%{buildroot}%{_sysconfdir}/init.d
install -d $init_d
cp scripts/cantas.rc ${init_d}/cantas

%clean
rm -rf %{buildroot}

%post
if [ $1 -eq 1 ]; then
   ln -sf %{_sysconfdir}/sysconfig/cantas-settings.json %{npminstdir}/settings.json 2>/dev/null || :;
   ln -sf %{npminstdir}/scripts/cantas-init.sh %{_bindir}/cantas-init.sh 2>/dev/null || :;
   # This adds the proper /etc/rc*.d links for the script
   /sbin/chkconfig --add %{npmname} &> /dev/null || :;
   # Setup upload folder soft link
   ln -sf %{_sharedstatedir}/%{npmname}/uploads %{npminstdir}/uploads 2>/dev/null || :;
   ln -sf %{_sharedstatedir}/%{npmname}/attachments %{npminstdir}/public/attachments 2>/dev/null || :;
fi

%preun
if [ $1 -eq 0 ]; then
    /sbin/service %{npmname} stop &> /dev/null || :;
    /sbin/chkconfig --del %{npmname} &> /dev/null || :;
fi

%postun
if [ $1 -eq 0 ]; then
   rm -rf %{npminstdir}/settings.json 2>/dev/null || :;
   rm -rf %{_bindir}/cantas-init.sh 2>/dev/null || :;
   /usr/sbin/userdel -f %{npmname} 2>/dev/null || :;
   rm -rf %{npminstdir}/uploads 2>/dev/null || :;
   rm -rf %{npminstdir}/public/attachments 2>/dev/null || :;
fi

%files
%defattr(-, root, root, -)
%doc README.md
%{npminstdir}
%config(noreplace) %dir %attr(0755, %{npmname}, root) %{_sharedstatedir}/%{npmname}
%config(noreplace) %dir %attr(0755, %{npmname}, root) %{_sharedstatedir}/%{npmname}/uploads
%config(noreplace) %dir %attr(0755, %{npmname}, root) %{_sharedstatedir}/%{npmname}/attachments
%dir %attr(0755, %{npmname}, root) %{_localstatedir}/log/%{npmname}
%attr(755, root, root) %{_sysconfdir}/init.d/cantas
%config(noreplace) %{_sysconfdir}/sysconfig/cantas-settings.json

%changelog
* Fri Feb 07 2013 Xiao Deshi <dxiao@redhat.com> 1.0.0-1
- bumped verion to 1.0.0

* Wed Dec 04 2013 Xiao Deshi <dxiao@redhat.com> 0.7.0-5
- FIX: rebuild the package (dxiao@redhat.com)

* Wed Dec 04 2013 Xiao Deshi <dxiao@redhat.com> 0.7.0-4
- REV: add dependencies version to spec file (dxiao@redhat.com)

* Fri Nov 29 2013 Xiao Deshi <dxiao@redhat.com> 0.7.0-3
- bumped version to 0.7.0-3 (dxiao@redhat.com)
- FIX: ignore CA validation process in request SSL (dxiao@redhat.com)

* Thu Nov 07 2013 Zheng Liu <zheliu@redhat.com> 0.7.0-2
- update version info and minify files for 0.7.0-2 (zheliu@redhat.com)
- Automatic commit of package [nodejs-cantas] release [0.6.0-3].
  (zheliu@redhat.com)
- REV: generate rpm package info (zheliu@redhat.com)
- Initialized to use tito. (zheliu@redhat.com)
- FIX: update bootstrap 3 modal hidden event (dxiao@redhat.com)
- FIX: new list show proper order when move list to another board
  (zheliu@redhat.com)
- REV: cantas-620 (xudong@redhat.com)
- REV: change tab to space based on dev convention (zheliu@redhat.com)
- FIX: can not add card after move list to other board (zheliu@redhat.com)
- FIX: jshint syntax fixed. (dxiao@redhat.com)
- FIX: send one socket to client when archive all cards of a list
  (zheliu@redhat.com)
- FIX: reduce the content of fetch label data. (zheliu@redhat.com)
- REV: modify the stop-sync button's style (xudong@redhat.com)
- WebUI: Update help doc (xiazhang@redhat.com)
- REV:replace old bootstrap to new version. (xiazhang@redhat.com)
- WebUI: modify markdown link description (xiazhang@redhat.com)
- FIX: server error when archive all cards of a list (zheliu@redhat.com)
- FIX: Bug 1018466 - [Board] Scroll bar cannot auto-move to the bottom of the
  list after sync BZURL to a list, if there are hundreds of bugs
  (xudong@redhat.com)
- REV: sync-all and stop-sync (xudong@redhat.com)
- REV: set the caption of the attachment-upload button to Attach
  (xudong@redhat.com)
- FIX: Bugfix cantas-618 (zheliu@redhat.com)
- FIX: Bugfix 1022416 (zheliu@redhat.com)
- WebUI: fix bug 984461 - card detail left button hidden (xiazhang@redhat.com)
- WebUI: fix bug-999285 help page blank issue (xiazhang@redhat.com)
- WebUI: fix - bug 983839 - email style overflow (xiazhang@redhat.com)
- FIX: syncAll/sync button should be disabled after click (zheliu@redhat.com)
- WebUI: markdown link is added. (xiazhang@redhat.com)
- FIX: As a board member I can sync all BZ URL~List mapping at once
  (zheliu@redhat.com)
- FIX: bug 507 (xudong@redhat.com)
- FIX: bug576-577 (xudong@redhat.com)
- FIX: when sync bugzilla, card with bugs have no initial lables
  (zheliu@redhat.com)
- FIX: Bugfix 1020157 (zheliu@redhat.com)
- FIX: lables can not be syncronized correctly when the user enters into the
  LabelAssign Window to edit selected status of the labels on the second time.
  (xudong@redhat.com)
- FIX: [mapping to bug-1006239]as a cantas user, when I move a card/list, the
  card/list position options should be the expect target position
  (xudong@redhat.com)
- FIX: modify the font-color of the browser support matrix (xudong@redhat.com)
- REV: git a support matrix based on testing Cantas on different versions of
  Firefox (xudong@redhat.com)
- REV: set the mini version of Firefox as 10.0 (xudong@redhat.com)
- FIX: Bugfix 953011 (zheliu@redhat.com)
- FIX: user enter any board, all list shadow fade in and fade out and scrollbar
  scrolls automaticly (xudong@redhat.com)
- WebUI: fix bug 982491  --- admin picture isn't shown in firefox 10.0.5
  (xiazhang@redhat.com)
- REV: refactor the code of adding sync config mapping (zheliu@redhat.com)
- FIX: Bugfix 999435 (zheliu@redhat.com)
- FIX: Bugfix 989296 (zheliu@redhat.com)
- FIX: Bugfix 983913 (zheliu@redhat.com)
- FIX: Bugfix 993523 (zheliu@redhat.com)
- FIX: Bugfix 1009329 (zheliu@redhat.com)
- FIX: Bug 1009290 - [attachment] delete btn in attachment is unavailable
  (xudong@redhat.com)
- FIX: Bug 1009296 - [card] Card details are not shown after add a caver
  picture to this card (xudong@redhat.com)
- FIX: Bug 1008843 - [archive] 'Add a card' is not at the bottom of the list
  (xudong@redhat.com)
- FIX: adjust the position of modal window (xudong@redhat.com)
- WebUI: larger the margin of comments (xiazhang@redhat.com)
- WebUI: fix some UI issues (xiazhang@redhat.com)
- FIX: when the move card page is opened, user can not see the current items of
  cantas (xudong@redhat.com)
- REV: sync mapping should not save when queryUrl/listName is invalid
  (zheliu@redhat.com)
- FIX: Auto complete option list order(Bug # 977239) (xudong@redhat.com)
- FIX:Auto complete option list order(Bug # 977239) (xudong@redhat.com)
- FIX: when the move card page is opened, user can not see the current items of
  cantas (xudong@redhat.com)
- FIX: Auto complete option list order(Bug # 977239) (xudong@redhat.com)
- REV: change content of msg. (zheliu@redhat.com)
- REV: can not save when queryUrl/listName is invalid (zheliu@redhat.com)
- REV: providing the Delete functionality of syncconfig info
  (xudong@redhat.com)
- REV:providing Edit functionality of syncconfig info (xudong@redhat.com)
- FIX: Bug 1012724 fix (dxiao@redhat.com)
- WebUI: Fix the bug - confirm dialog display wrong (xiazhang@redhat.com)
- WebUI: loading bug fix (xiazhang@redhat.com)
- WebUI: add mapping loading styles (xiazhang@redhat.com)
- WebUI: change delete and disable styles (xiazhang@redhat.com)
- REV: Auto complete option list order(Bug # 977239) (xudong@redhat.com)
- REV: creating the  bug mapping item based on a new list (xudong@redhat.com)
- FIX: card will back to list when sync second time (zheliu@redhat.com)
- REV: update card info when sync the second time (zheliu@redhat.com)
- REV: sync one mapping relation by click (dxiao@redhat.com)
- REV: add BZ-URL get informed the content in my url (dxiao@redhat.com)
- REV: modify the sync bug key (zheliu@redhat.com)
- REV: the syncconfig item view(without validation) (xudong@redhat.com)
- FIX: missing syncConfig.js to Grunt concat step (dxiao@redhat.com)
- REV: create card based on bug list got from bugzilla (zheliu@redhat.com)
- WebUI: Import Bugzilla function prototype (xiazhang@redhat.com)
- FIX: missing syncConfig.js in jasmine track files (dxiao@redhat.com)
- FIX: enable import from bugzilla modal close event (dxiao@redhat.com)
- WIP: providing the model and CRUD js filefor saving the sync config info
  (xudong@redhat.com)
- FIX: sonar-project.properties config restore (dxiao@redhat.com)
- FIX:  sonar.exclusions can't support regex array (dxiao@redhat.com)
- FIX: vote model socket bind many times. (dxiao@redhat.com)
- FIX: sonar exclusions have not effective (dxiao@redhat.com)
- REV: providing a modal window for import bugs from bugzilla action
  (xudong@redhat.com)
- FIX: modify the version checkout of safari in login page (xudong@redhat.com)
- FIX: modify the version checktout of safari browser (xudong@redhat.com)
- FIX:when the move card page is opened, user can not see the current items of
  cantas (xudong@redhat.com)
- REV: syncConfig mapping is active by default (zheliu@redhat.com)
- REV: bugzilla api wrapper (zheliu@redhat.com)
- REV: modify field name of syncConfig (zheliu@redhat.com)
- REV: add db schema for bugzilla integration (zheliu@redhat.com)
- REV: Clickable links in comments (xudong@redhat.com)
- REV:  Support Markdown format in Card's description (xudong@redhat.com)
- FIX: clean duplicate socket binds to views (dxiao@redhat.com)
- FIX: modify auto complete option list order (xudong@redhat.com)
- FIX: when the move card page is opened, user can not see the current items of
  cantas (xudong@redhat.com)

* Fri Sep 13 2013 Zheng Liu <zheliu@redhat.com> 0.6.0-3
- new package built with tito

* Mon Aug 26 2013 Xiao Deshi <dxiao@redhat.com> 0.5.1-1
- REV: 0.5.1 bump version (dxiao@redhat.com)
- REV: apply piwik url to settgins.json (dxiao@redhat.com)

* Tue Aug 13 2013 Xiao Deshi <dxiao@redhat.com> 0.5.0-1
- new package built with tito
- cantas 0.5 package

* Fri Jul 19 2013 Xiao Deshi <dxiao@redhat.com> 0.3.2-4
- FIX: servie script correct (dxiao@redhat.com)

* Fri Jul 19 2013 Xiao Deshi <dxiao@redhat.com> 0.3.2-3
- FIX: 0.3.2-3 (dxiao@redhat.com)
- 0.3.0 assets (dxiao@redhat.com)
- FIX: init.d correct the behavior (dxiao@redhat.com)
- Automatic commit of package [nodejs-cantas] release [0.3.2-1].
  (dxiao@redhat.com)

* Fri Jul 19 2013 Xiao Deshi <dxiao@redhat.com>
- 0.3.0 assets (dxiao@redhat.com)
- FIX: init.d correct the behavior (dxiao@redhat.com)
- Automatic commit of package [nodejs-cantas] release [0.3.2-1].
  (dxiao@redhat.com)

* Mon Jul 15 2013 Xiao Deshi <dxiao@redhat.com> 0.3.2-1
- FIX: remove invited member function correct (dxiao@redhat.com)
- FIX: remove annoying socket connect status checkflag (dxiao@redhat.com)
- FIX: bug 983337 (dxiao@redhat.com)
- FIX: correctly username usage in user query (dxiao@redhat.com)
- FIX: bug 982229 (dxiao@redhat.com)
- Automatic commit of package [nodejs-cantas] release [0.3.1-2].
  (dxiao@redhat.com)
- FIX: Add success status code (dxiao@redhat.com)
- REV: udpate nodejs-cantas spec (dxiao@redhat.com)
- add migration script to 0.3 (dxiao@redhat.com)
- bundle to production js (dxiao@redhat.com)
- Automatic commit of package [nodejs-cantas] release [0.3.1-1].
  (dxiao@redhat.com)

* Mon Jul 08 2013 Xiao Deshi <dxiao@redhat.com> 0.3.1-2
- FIX: Add success status code (dxiao@redhat.com)
- REV: udpate nodejs-cantas spec (dxiao@redhat.com)
- add migration script to 0.3 (dxiao@redhat.com)
- bundle to production js (dxiao@redhat.com)
- REV: update spec (dxiao@redhat.com)
- REV: remove test task from default task list (dxiao@redhat.com)
- FIX: remote_user should not contain email suffix (dxiao@redhat.com)
- REV: update support link url (dxiao@redhat.com)
- Automatic commit of package [nodejs-cantas] release [0.3.0-1].
  (dxiao@redhat.com)
- REV: update spec (dxiao@redhat.com)

* Mon Jul 08 2013 Xiao Deshi <dxiao@redhat.com> 0.3.1-2
- bundle to production js (dxiao@redhat.com)
- REV: update spec (dxiao@redhat.com)
- REV: remove test task from default task list (dxiao@redhat.com)
- FIX: remote_user should not contain email suffix (dxiao@redhat.com)
- REV: update support link url (dxiao@redhat.com)
- Automatic commit of package [nodejs-cantas] release [0.3.0-1].
  (dxiao@redhat.com)
- REV: update spec (dxiao@redhat.com)

* Wed Jul 03 2013 Xiao Deshi <dxiao@redhat.com> 0.3.0-1
- new package built with tito
- 0.3.0
* Thu Jun 13 2013 Deshi Xiao <dxiao@redhat.com> - 0.2.1-4
- Dynamic allocation service user: cantas
- REV: minify javascript request
- bug fix: Bug 970250, 974504, 970254
* Thu Jun 13 2013 Deshi Xiao <dxiao@redhat.com> - 0.2.0-1
- bumped to git hash 206202d
* Wed May 15 2013 Deshi Xiao <dxiao@redhat.com - 0.1.0-6
- init script clean
* Wed May 08 2013 Chenxiong Qi <cqi@redhat.com> - 0.1.0-5
- rc script to control Cantas service
* Fri Apr 26 2013 Deshi Xiao <dxiao@redhat.com> - 0.1.0-4
- fix release version typo
* Fri Apr 26 2013 Deshi Xiao <dxiao@redhat.com> - 0.1.0-3
- update source code
* Fri Apr 26 2013 Deshi Xiao <dxiao@redhat.com> - 0.1.0-2
- put settings to sysconfig path, fix deplist typo
* Thu Apr 25 2013 Deshi Xiao <dxiao@redhat.com> - 0.1.0-1
- Initial build
