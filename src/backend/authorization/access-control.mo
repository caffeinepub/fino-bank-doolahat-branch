import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  /// Roles ordered by privilege level (guest < user < admin)
  public type UserRole = { #guest; #user; #admin };

  public type AccessControlState = {
    userRoles : Map.Map<Principal, UserRole>;
  };

  /// Create a fresh AccessControlState
  public func initState() : AccessControlState {
    { userRoles = Map.empty<Principal, UserRole>() };
  };

  /// Assign a role to a principal (overwrites any existing role)
  public func setUserRole(state : AccessControlState, user : Principal, role : UserRole) {
    state.userRoles.add(user, role);
  };

  /// Get the role for a principal. Anonymous callers get #guest; authenticated callers default to #user.
  public func getUserRole(state : AccessControlState, user : Principal) : UserRole {
    if (user == Principal.anonymous()) { return #guest };
    switch (state.userRoles.get(user)) {
      case (?role) { role };
      case null { #user };
    };
  };

  /// True if caller's role is at least as privileged as the required role.
  /// Privilege order: #guest < #user < #admin
  public func hasPermission(state : AccessControlState, caller : Principal, required : UserRole) : Bool {
    let role = getUserRole(state, caller);
    switch (required) {
      case (#guest) { true };
      case (#user) {
        switch (role) {
          case (#user or #admin) { true };
          case (#guest) { false };
        };
      };
      case (#admin) {
        switch (role) {
          case (#admin) { true };
          case (_) { false };
        };
      };
    };
  };

  /// Convenience: true if the caller has the #admin role
  public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
    hasPermission(state, caller, #admin);
  };
};
