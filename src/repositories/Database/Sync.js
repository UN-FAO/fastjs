import _filter from 'lodash/filter';
import User from 'database/models/User';
import Auth from 'repositories/Auth/Auth';
import Connection from 'Wrappers/Connection';
import Submission from 'database/models/Submission';
import OfflineData from 'repositories/Submission/OfflineData';

let Sync = class {
  /**
   *
   * @param {*} vm
   */
  static async now (vm) {
    const isOnline = Connection.isOnline();

    if (isOnline) {
      await this.syncUsers({ isOnline });
    }
    if (isOnline && Auth.check()) {
      await this.syncSubmission(vm);
    }
  }
  /**
   *
   * @param {*} db
   * @param {*} vm
   */
  static async syncSubmission () {
    let usersAreSync = await this.areUsersSynced();

    if (!usersAreSync) {
      return;
    }

    let unsyncSubmissions = await Submission.local().getUnsync();

    if (unsyncSubmissions.length > 0) {
      OfflineData.send(unsyncSubmissions);
    }
  }
  /**
   *
   */
  static async getUsersToSync () {
    let filter = await User.local().find({
      'data.sync': false
    });

    return _filter(filter, function (o) {
      return o.data.sync === false;
    });
  }
  /**
   *
   */
  static async areUsersSynced () {
    let users = await this.getUsersToSync();

    return !!users && Array.isArray(users) && users.length === 0;
  }
  /**
   *
   * @param {*} param
   */
  static async syncUsers ({ isOnline }) {
    let users = await this.getUsersToSync();

    users = _filter(users, function (o) {
      return o.data.sync === false && !o.data.queuedForSync && !o.data.syncError;
    });

    if (Array.isArray(users) && users.length > 0) {
      OfflineData.send(users);
    }
  }
};

export default Sync;