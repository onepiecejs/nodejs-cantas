/*
 * Views to provide ability to display and manage a board members.
 */

(function ($, _, Backbone) {

  "use strict";

  /*
   * Represent the area of each board member in member list to view.
   */
  cantas.views.MemberView = cantas.views.BaseView.extend({
    tagName: "li",
    template: _.template("<%= email %><a>×</a>"),

    render: function() {
      var data = { email: this.model.get("userId").email };
      this.$el.html(this.template(data)).attr("tabindex", -1);

      var creator = cantas.utils.getCurrentBoardModel().get("creatorId")._id;
      var curUser = cantas.utils.getCurrentUser();
      var curUserIsCreator = curUser.id === creator;
      if (curUserIsCreator) {
        // Remove revoke control to avoid revoke me from member list
        var isShowingCreator = this.model.get("userId")._id === curUser.id;
        if (isShowingCreator) {
          this.$el.find("a").remove();
        }
      } else {
        // Disable revoke operation for non-creator
        this.$el.find("a").remove();
      }
      return this;
    }
  });

  // I need a collection board's members
  cantas.views.BoardMembersView = Backbone.View.extend({
    // TODO: code there
    events: {
      //:
    },

    initialize: function(options) {
      this.model.on("add", this.addBoardMember, this);
    },

    // A board member is added in server-side, show this member in member list.
    addBoardMember: function(model) {

    }
  });

  /*** Board member management ***/

  /*
   * Represent the area of each board member to edit.
   */
  cantas.views.BoardMemberEditionView = Backbone.View.extend({

  });

  // I also need the collection of board's members that is same as BoardMembersView
  cantas.views.BoardMembersManageView = Backbone.View.extend({
    el: "div.invite",
    events: {
      "keydown .input-member": "onMemberInputKeyup",
      "keyup .input-member": "onMemberInputKeyup",
      "click ul.toBeInvitedUsers li a": "closeMemberTag",
      "click .invite-member li a": "revokeMembership",
      "keyup .invite-new .invite-display": "deleteMemberTag",
      "keydown .invite-new .invite-display": "focusMemberTag",
      "click ul.toBeInvitedUsers li:not(:has(input))": "selectMemberTag",
      "click .invite-new .invite-display": "focusOnMemberInput",
      "click #btn-invite": "onInviteClick",
      "click .collapse-bar": "toggleInviteMember",
      "click header a": "toggleInviteMember"
    },

    initialize: function(options) {
      // Internal use
      this.cache = {};

      this.memberViews = [];

      this.collection.on("add", this.showBoardMember, this);

      //when clicking outside area of the div.tip, it will disappear.
      $(".invite").on("click", function (event) {
        var e = event || window.event;
        var elem = e.srcElement || e.target;
        while (elem && elem !== $(".invite")[0]) {
          if (elem.className.indexOf("invite-tip") > -1) {
            return;
          }
          elem = elem.parentNode;
        }
        $(".invite-tip").hide();
      });

      var iCursorPosition = 0;
      this.bConfirmDeleteMember = true;

      this.socketInit();
      this.showMembersOnlyOnce();
    },

    socketInit: function() {
      var that = this;
      var sock = cantas.socket;

      sock.removeAllListeners("user-exists-resp");
      sock.on("user-exists-resp", function(data) {
        var resp = data.data;
        if (!resp.exists) {
          if (resp.isEmailAddr) {
            that.showValidationMessage(resp.username + " is not Cantas user, invite to Cantas?");
          } else if (resp.username.indexOf('@') !== -1) {
            that.showValidationMessage(resp.username + " is not a REDHAT account.");
          }
          that.markMemberCandidateError(resp.username);
        }
        that.toggleInviteButton();
      });

      sock.removeAllListeners("revoke-membership-resp");
      sock.on("revoke-membership-resp", function(data) {
        that.revokeMembershipResp(data);
      });
    },

    /*
     * Invite button is enabled when there is one effective member candidate at
     * least.
     */
    toggleInviteButton: function() {
      var toEnable = this.getCandidateMembers().length > 0;
      if (toEnable) {
        $("#btn-invite").removeAttr("disabled");
      } else {
        $("#btn-invite").attr("disabled", "disabled");
      }
    },

    focusOnMemberInput: function() {
      this.$el.find("input.input-member").focus();
    },

    // A board member is added in server-side, show this member in member list.
    showBoardMember: function(memberRelation) {
      var container = this.getMembersDisplayContainer();
      var view = new cantas.views.MemberView({
        model: memberRelation
      });
      container.append(view.render().el);
      // Remember this view. You can add any possible operations on these
      // view, such find, remove, etc.
      this.memberViews.push(view);
    },

    makeNewMemberBeCandidate: function(event, memberInput) {
      var trimName = $.trim(memberInput.val());
      trimName = trimName.indexOf(",") > -1 ? trimName.slice(0, trimName.indexOf(",")) : trimName;

      if (trimName.length > 0) {
        if (this.$el.find(".invite-new .tip:visible").length > 0) {
          this.$el.find(".invite-new .tip").hide();
        }

        memberInput.val("").attr("size", 2);
        this.$('div.responseData ul').hide();

        var isValidEmailAddr = null;
        if (cantas.utils.checkEmail(trimName)) {
          $(event.target.parentNode).before('<li tabindex="-1">' + trimName + '<a>×</a></li>');
          isValidEmailAddr = true;
        } else {
          this.showValidationMessage(trimName + ' is not a valid email address.');
          isValidEmailAddr = false;
        }
        return isValidEmailAddr;
      }
    },

    /*
     * Get candidate members elements in the input area.
     *
     * options contains following items,
     * - effective: get those that are acceptable bypassing validation. This is
     *   the default behavior. If you want all input members' usernames, passing
     *   { effective: false }.
     */
    getCandidateMembers: function(options) {
      var opts = options || { effective: true };
      var selectedMembers = null;
      if (opts.effective) {
        selectedMembers = this.$el.find("ul.toBeInvitedUsers li:not(.warning)").not(":has(input)");
      } else {
        selectedMembers = this.$el.find("ul.toBeInvitedUsers li").not(":has(input)");
      }
      return selectedMembers;
    },

    getMemberCandidateName: function(elem) {
      return elem.firstChild.textContent;
    },

    //// Validation ////

    showValidationMessage: function(message) {
      var isShown = this.$el.find(".invite-new .tip").length > 0;
      if (isShown) {
        this.$el.find(".invite-new .tip").text(message).show();
      } else {
        // FIXME: move this piece of HTML into template
        this.$el
          .find(".invite-new .invite-display")
          .after('<div class="tip invite-tip">' + message + '</div>')
          .next()
          .css("display", "block");
      }
    },

    isMemberAlready: function(username) {
      var that = this;
      var result = false;
      this.$el.find(".invite-member li").each(function(index, elem) {
        if (that.getMemberCandidateName(elem) === username) {
          result = true;
          return true;
        }
      });
      return result;
    },

    /*
     * To see whether username is input just.
     *
     * If username is input already, deny the input by dropping the name and
     * show a message to notify user.
     */
    inputAlready: function(username) {
      var that = this;
      var result = false;
      /*
       * Drop the last one, which is being validating. By calling
       * getCandidateMembers function to get all effective users in the input
       * area, we can reuse this function and don't need another modification
       * or standalone specific function to achieve our requirement.
       */
      var options = { effective: false };
      var inputUsernames = this.getCandidateMembers(options).slice(0, -1);
      inputUsernames.each(function(index, elem) {
        if (that.getMemberCandidateName(elem) === username) {
          result = true;
          return true;
        }
      });
      return result;
    },

    validateRecentCandidate: function() {
      var recentMemberCandidate = this.getCandidateMembers().last()[0];
      var username = this.getMemberCandidateName(recentMemberCandidate);
      if (this.inputAlready(username)) {
        this.showValidationMessage("The user name '" + username + "' has existed.");
        //this.markMemberCandidateError(username);
        this.deleteRedundantMember(username);
      } else if (this.isMemberAlready(username)) {
        this.showValidationMessage(username + " is this board's member already.");
        //this.markMemberCandidateError(username);
        this.deleteRedundantMember(username);
      } else {
        cantas.socket.emit("user-exists", { username: username });
      }
    },

    //// End of Validation ////

    markMemberCandidateError: function(username) {
      var that = this;
      var memberCandidates = this.getCandidateMembers();
      memberCandidates.each(function(index, li) {
        var thatsit = that.getMemberCandidateName(li) === username;
        if (thatsit) {
          $(li).addClass("warning");
          return;
        }
      });
    },

    deleteRedundantMember: function(username) {
      var that = this;
      var memberCandidates = this.getCandidateMembers({ effective: false });
      memberCandidates.last().remove();
    },

    onMemberInputKeyup: function(event) {
      var txt_inputMember = this.$el.find(".input-member");
      var _this = this;
      $(".input-member").autocomplete({
        source: function (req, res) {
          $.ajax({
            url: "/api/search_member",
            type: "GET",
            data: req
          })
            .success(function (data) {
              var re = $.ui.autocomplete.escapeRegex(req.term);
              var matcher = new RegExp("^" + re, "i");
              var beginningMatchedData = $.grep(data, function(element) {
                return matcher.test(element.email);
              });
              var middleMatchedData = $.grep(data, function(element) {
                return !matcher.test(element.email);
              });
              var targetMatchedData = [];
              var count = 0;
              var i = 0;
              for (i; i < 20; i++) {
                if (beginningMatchedData[i]) {
                  targetMatchedData.push(beginningMatchedData[i].email);
                } else if (middleMatchedData[count] && count < 20) {
                  targetMatchedData.push(middleMatchedData[count].email);
                  count++;
                } else {
                  break;
                }
              }
              res($.map(targetMatchedData, function(el) {
                return {
                  label: el,
                  value: el
                };
              }));
            });
        },
        minLength: 1,
        messages: {
          noResults: '',
          results: function() {}
        },
        select: function(event, ui) {
          txt_inputMember.val(ui.item.value);
          if (_this.makeNewMemberBeCandidate(event, txt_inputMember)) {
            _this.validateRecentCandidate();
          }
          return false;
        },
        response: function(event, ui) {
          var inviteDisplay = _this.$('div.invite-new div.invite-display');
          var userList = inviteDisplay.find('div.responseData');
          if (userList.length === 0) {
            $('ul.ui-autocomplete').css({
              'position': 'absolute',
              'top': inviteDisplay.height(),
              'left': 0
            })
              .wrap('<div class="responseData"></div>')
              .parent()
              .appendTo(inviteDisplay);
          } else {
            $('ul.ui-autocomplete').appendTo(userList);
          }
        }
      });

      if (txt_inputMember.val().length > 1) {
        var iInputOuterWidth = $(event.target).outerWidth(true);
        var iUlWidth = $(event.target).closest("ul").width();
        if (iInputOuterWidth < iUlWidth) {
          txt_inputMember.attr("size", txt_inputMember.val().length);
        }
      }
      var keycodes = cantas.KEY_CODES;
      if (event.which === keycodes.COMMA ||
          event.which === keycodes.SPACE ||
          event.which === keycodes.ENTER) {
        var trimName = $.trim(txt_inputMember.val());
        if (trimName.length === 0 || trimName.replace(/,/g, " ").trim().length === 0) {
          txt_inputMember.val("").attr("size", 2);
          return;
        }
        if (this.makeNewMemberBeCandidate(event, txt_inputMember)) {
          this.validateRecentCandidate();
        }
      }
    },

    closeMemberTag: function(event) {
      $(event.target.parentNode).remove();
      this.toggleInviteButton();
      this.focusOnMemberInput();
    },

    deleteMemberTag: function(event) {
      var keycodes = cantas.KEY_CODES;
      if (event.which === keycodes.BACKSPACE) {
        var temp = {};
        if ($(document.activeElement).is("li")) {
          if ($(document.activeElement).next()[0] === this.$el.find(".input-member").parent()[0]) {
            $(document.activeElement).remove();
            temp = this.$el.find(".input-member").val();
            this.$el.find(".input-member").val("").focus().val(temp);
          } else {
            temp = $(document.activeElement);
            $(document.activeElement).prev().focus();
            if (temp.prev().length === 0) {
              this.$el.find(".input-member").focus();
            }
            temp.remove();
          }
        } else if (this.$el.find("li input:focus").length > 0 &&
            this.iCursorPosition === 0 &&
            this.iCursorPosition === this.$el.find(".input-member")[0].selectionStart) {
          this.$el.find(".input-member").parent().prev().focus();
        }
      }
    },

    focusMemberTag: function(event) {
      var keycodes = cantas.KEY_CODES;
      if (event.which === keycodes.BACKSPACE) {
        if ($(document.activeElement).is("li")) {
          event.preventDefault();
        }
        if ($(document.activeElement).is("input")) {
          this.iCursorPosition = this.$el.find(".input-member")[0].selectionStart;
        }
      }
      if (event.which === keycodes.LEFT_ARROW) {
        if ($(document.activeElement).is("li")) {
          $(document.activeElement).prev().focus();
        } else if (this.$el.find("li input:focus").length > 0 &&
            this.$el.find(".input-member").val() === "") {
          this.$el.find(".input-member").prev().focus();
        }
      }
      if (event.which === keycodes.RIGHT_ARROW) {
        if ($(document.activeElement).is("li")) {
          if ($(document.activeElement).next().is("li:has(input)")) {
            this.$el.find(".input-member").focus();
          } else {
            $(document.activeElement).next().focus();
          }
        }
      }
    },

    selectMemberTag: function(event) {
      event.stopPropagation();
    },

    getMembersDisplayContainer: function() {
      var container = this.cache.membersContainer;
      if (container === undefined) {
        container = this.$el.find(".invite-member .invite-display ul");
        this.cache.membersContainer = container;
      }
      return container;
    },

    onInviteClick: function(event) {
      var that = this;
      var elems = this.getCandidateMembers();
      if (elems.length === 0) {
        return;
      }

      // If the user is not board admin, he can not revoke a member, hide the ×.
      var creator = this.getCurrentBoard().attributes.creatorId;
      var boardCreatorId = (typeof creator === "object") ? creator._id : creator;
      if (boardCreatorId !== this.getCurrentUser().id) {
        elems.find("a").remove();
      }

      // Move invitees from input area to member list in the bottom of manage area.
      this.getMembersDisplayContainer().append(elems);

      var invitees = [];
      elems.each(function(index, li) {
        invitees.push(that.getMemberCandidateName(li));
      });
      this.requestInvitation(invitees);

      this.focusOnMemberInput();
      this.toggleInviteButton();
    },

    requestInvitation: function(invitees) {
      var sock = cantas.socket;
      sock.once("invite-board-member-resp", function(data) {
        // TODO: to do something with return value
      });
      // Send request to back-end to build member relationship
      var curBoardModel = cantas.utils.getCurrentBoardModel();
      var data = {
        boardId: curBoardModel.id,
        boardUrl: _.result(curBoardModel, 'url'),
        inviter: cantas.user.username,
        invitees: invitees
      };
      sock.emit("invite-board-member", data);
    },

    toggleInviteMember: function(event) {
      if ($(".activity:visible").length === 1) {
        $(".activity").hide();
      }
      this.$el.toggle("slide", {direction: "right"}, "fast");
    },

    remove: function() {
      _.forEach(this.memberViews, function(thatView) {
        thatView.close();
      });
      this.collection.dispose();
      this.undelegateEvents();
      this.stopListening();
      return this;
    },

    /*
     * Fetch all board members and show them only once. That is this function
     * can be invoked **more than once**, and members are fetched and displayed
     * only once.
     *
     * After show members, all views of them are remember in current View.
     */
    showMembersOnlyOnce: function() {
      if (this.membersLoadedAndShown !== undefined) {
        return;
      }

      this.collection.fetch({
        data: {
          boardId: cantas.utils.getCurrentBoardModel().id,
          $or: [{status: "available"}, {status: "inviting"}]
        }
      });

      // Whatever the value is, as long as it has a value.
      this.membersLoadedAndShown = true;
    },

    getCurrentBoard: function() {
      return cantas.utils.getCurrentBoardView().model;
    },

    getCurrentUser: function() {
      return cantas.user;
    },

    confirmDeleteMember: function(event) {
      event.stopPropagation();

      $("body").click();

      var that = this;
      cantas.utils.getCurrentBoardView().confirmDialogView.render({
        operationType: "delete",
        operationItem: "member",
        confirmInfo: "Are you sure to delete this member?",
        captionYes: "Delete",
        yesCallback: function() {
          that.emitMembership({"deleteObj": event.target.parentNode});

          if ($("#js-cb-noask:checked").length > 0) {
            that.bConfirmDeleteMember = false;
          }

          $("#confirm-dialog").hide();
        },
        captionNo: "Cancel",
        noCallback: function() {
          $("#confirm-dialog").hide();
        },
        pageX: event.pageX,
        pageY: event.pageY
      });
    },

    /*
     * pop up dialog to confirm deleting the member or not
     */
    revokeMembership: function(event) {
      if (!cantas.appRouter.currentView.confirmDialogView) {
        cantas.appRouter.currentView.confirmDialogView = new cantas.views.ConfirmDialogView();
      }
      if (this.bConfirmDeleteMember) {
        $(event.target.parentNode).focus();
        this.confirmDeleteMember(event);
      } else {
        this.emitMembership({"deleteObj": event.target.parentNode});
      }
    },

    /*
     * Get the name of user and tell all users who are in current board whose
     * membership is revoked.
     */
    emitMembership: function(data) {
      var socket = cantas.socket;
      var username = this.getMemberCandidateName(data.deleteObj);
      socket.emit("revoke-membership", {
        sender: cantas.utils.getCurrentUser().id,
        username: username,
        boardId: cantas.utils.getCurrentBoardModel().id
      });
    },

    /*
     * Handle event that a board member's membership is revoked.
     *
     * Remove the member from member list. And then if current user is that one,
     * should prompt him/her?
     */
    revokeMembershipResp: function(data) {
      if (data.ok === 0) {
        var lis = this.$el.find(".invite-member li");
        var username = data.data.username;
        lis.each(function(index, li) {
          var _liTextContent = li.firstChild.textContent.split('@')[0];
          if (_liTextContent === username) {
            $(li).remove();
            return true;
          }
        });

        // In the meanwhile, if the removing user is being in the board, notify
        // and bring him/her to board again
        if (data.data.updated.userId._id === cantas.utils.getCurrentUser().id &&
            data.data.updated.boardId === cantas.utils.getCurrentBoardId()) {

          var isPublic = cantas.utils.getCurrentBoardModel().attributes.isPublic;
          var dialog = $(".force-alert");
          if (isPublic) {
            dialog.find("p")
              .text("Your membership is revoked. You are not a member of this board from now.");
            dialog.find("a")
              .attr("href", window.location)
              .text("Please reload this board!");
            dialog.modal({backdrop: 'static'});

          } else {
            dialog.find("p")
              .text("Your membership is revoked from this private board.");
            dialog.find("a")
              .attr("href", "/boards/mine")
              .text("Please go to home page!");
            dialog.modal({backdrop: 'static'});
          }
        }
      } else {
        alert(data.data);
      }
    }

  });

}(jQuery, _, Backbone));
