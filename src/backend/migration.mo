import Map "mo:core/Map";
import Principal "mo:core/Principal";

module {
  type UserRole = { #admin; #guest; #user };

  // Old AccessControlState had an extra `adminAssigned` field
  type OldAccessControlState = {
    var adminAssigned : Bool;
    userRoles : Map.Map<Principal, UserRole>;
  };

  type OldActor = {
    accessControlState : OldAccessControlState;
  };

  type NewAccessControlState = {
    userRoles : Map.Map<Principal, UserRole>;
  };

  type NewActor = {
    accessControlState : NewAccessControlState;
  };

  // Drop adminAssigned, preserve userRoles
  public func run(old : OldActor) : NewActor {
    {
      accessControlState = {
        userRoles = old.accessControlState.userRoles;
      };
    };
  };
};
