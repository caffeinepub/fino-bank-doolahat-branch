import AccessControl "access-control";
import Principal "mo:core/Principal";

/// Mixin that exposes authorization-related public functions.
/// Inject the shared AccessControlState from the actor.
mixin (accessControlState : AccessControl.AccessControlState) {

  /// Initialize access control with a secret (no-op in this implementation —
  /// the canister controller is automatically treated as admin via the frontend).
  public shared ({ caller }) func _initializeAccessControlWithSecret(_secret : Text) : async () {
    AccessControl.setUserRole(accessControlState, caller, #admin);
  };

  /// Returns the UserRole of the calling principal.
  public query ({ caller }) func getCallerUserRole() : async AccessControl.UserRole {
    AccessControl.getUserRole(accessControlState, caller);
  };

  /// Assigns the given UserRole to the calling principal.
  public shared ({ caller }) func assignCallerUserRole(role : AccessControl.UserRole) : async () {
    AccessControl.setUserRole(accessControlState, caller, role);
  };

  /// Returns true if the caller has the #admin role.
  public query ({ caller }) func isCallerAdmin() : async Bool {
    AccessControl.isAdmin(accessControlState, caller);
  };
};
