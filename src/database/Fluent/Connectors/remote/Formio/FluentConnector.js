import to from 'await-to-js';
// import Utilities from 'utilities';
import axios from 'axios';
import Interface from '../../../Interface';
import compose from '@stamp/compose';

export default compose(
  Interface,
  {
    methods: {
      async get () {
        let error;
        let result;

        [error, result] = await to(this.httpGET());

        if (error) {
          console.log(error);
          throw new Error('Error while getting submissions');
        }

        result = this.jsApplySelect(result.data);
        result = this.jsApplyOrderBy(result);
        return result;
      },
      async all () {
        return this.get();
      },
      async insert (data) {
        data = { data: data };

        let [error, result] = await to(this.httpPOST(data));

        if (error) {
          console.log(error);
          throw new Error('Cannot insert data');
        }
        return result.data;
      },
      async clear ({ sure } = {}) {
        if (!sure || sure !== true) {
          throw new Error(
            'Clear() method will delete everything!, you must set the "sure" parameter "clear({sure:true})" to continue'
          );
        }
        let promises = [];
        let headers = this.getHeaders();
        let [error, data] = await to(this.select('_id').pluck('_id'));

        if (error) {
          console.log(error);
          throw new Error('Cannot get remote Model');
        }

        let url = this.getUrl().slice(0, -1);

        data.forEach((_id) => {
          let fullUrl = url + '/' + _id;

          promises.push(axios.delete(fullUrl, { headers }));
        });

        return axios.all(promises);
      },
      getUrl () {
        let baseUrl =
          this.remoteConnection && this.remoteConnection.baseUrl ? this.remoteConnection.baseUrl : undefined;
        let path = this.remoteConnection && this.remoteConnection.path ? this.remoteConnection.path : undefined;

        if (!this.remoteConnection.pullForm) {
          path = path + '/submission?';
        }

        if (!baseUrl || !path) {
          throw new Error('Cannot get remote model. BaseUrl or Path is not defined');
        }

        let url = baseUrl + path;

        return url;
      },
      getHeaders () {
        let headers = {};

        // Include Auth headers
        if (this.remoteConnection.token) {
          let type = this.getTokenType(this.remoteConnection.token);

          headers[type] = this.remoteConnection.token;
        }

        return headers;
      },
      httpGET () {
        let url = this.getUrl();
        let headers = this.getHeaders();

        let filters = this.getFilters();
        let limit = this.getLimit();
        let skip = this.getSkip();
        let select = this.getSelect();
        let spacer = '';

        if (filters) {
          spacer = url.substr(url.length - 1) === '&' ? '' : '&';
          url = url + spacer + filters;
        }

        if (limit) {
          spacer = url.substr(url.length - 1) === '&' ? '' : '&';
          url = url + spacer + limit;
        }

        if (skip) {
          spacer = url.substr(url.length - 1) === '&' ? '' : '&';
          url = url + spacer + skip;
        }

        if (select) {
          spacer = url.substr(url.length - 1) === '&' ? '' : '&';
          url = url + spacer + select;
        }
        return axios.get(url, { headers });
      },
      httpPOST (data) {
        let url = this.getUrl();
        let headers = this.getHeaders();

        return axios.post(url, data, { headers });
      },
      getTokenType (token) {
        if (token.length > 32) {
          return 'x-jwt-token';
        }
        return 'x-token';
      },
      getFilters () {
        let filter = this.whereArray;

        if (!filter || filter.length === 0) {
          return undefined;
        }

        let filterQuery = '';

        filter.forEach((condition) => {
          let valueString = '';
          let element = condition[0];
          let operator = condition[1];
          let value = condition[2];

          switch (operator) {
            case '=':
              filterQuery = filterQuery + element + '=' + value + '&';
              break;
            case '!=':
              filterQuery = filterQuery + element + '__ne=' + value + '&';
              break;
            case '>':
              filterQuery = filterQuery + element + '__gt=' + value + '&';
              break;
            case '>=':
              filterQuery = filterQuery + element + '__gte=' + value + '&';
              break;
            case '<':
              filterQuery = filterQuery + element + '__lt=' + value + '&';
              break;
            case '<=':
              filterQuery = filterQuery + element + '__lte=' + value + '&';
              break;
            case 'in':
              valueString = '';
              value.forEach((val, index, array) => {
                valueString = index === array.length - 1 ? valueString + val : valueString + val + ',';
              });
              filterQuery = filterQuery + element + '__in=' + valueString + '&';
              break;
            case 'nin':
              valueString = '';
              value.forEach((val, index, array) => {
                valueString = index === array.length - 1 ? valueString + val : valueString + val + ',';
              });
              filterQuery = filterQuery + element + '__nin=' + valueString + '&';
              break;
            case 'exists':
              filterQuery = filterQuery + element + '__exists=' + true + '&';
              break;
            case '!exists':
              filterQuery = filterQuery + element + '__exists=' + false + '&';
              break;
            case 'regex':
              filterQuery = filterQuery + element + '__regex=' + value + '&';
              break;
          }
        });
        return filterQuery.substring(0, filterQuery.length - 1);
      },
      getLimit () {
        let limit = 'limit=';

        if (!this.limitNumber || this.limitNumber === 0) {
          this.limitNumber = 9999999;
        }

        return limit + this.limitNumber;
      },
      getSkip () {
        let skip = 'skip=';

        if (!this.offsetNumber) {
          this.offsetNumber = 0;
        }

        return skip + this.offsetNumber;
      },
      getSelect () {
        let select = this.selectArray;

        select = select.map((e) => {
          return e.split(' as ')[0];
        });

        if (!select) {
          return;
        }

        return 'select=' + select.join(',');
      }
    }
  }
);

/**
  const remoteModel = ((path) => {
    let all = async function () {
      let remoteData, error;
      let formio = await getFormioInstance({ path });

      [error, remoteData] = await to(formio.loadForms());
      if (error) {
        console.log(error);
        throw new Error('Cannot get data');
      }

      return remoteData;
    };

    async function find ({ filter = undefined, limit = 30, select = undefined, populate = undefined, pagination }) {
      let remoteSubmissions, error;
      let formio = await getFormioInstance({ path: path });

      let queryParams = {
        limit: limit
      };

      if (filter && Array.isArray(filter)) {
        let filterQuery = filterToString(filter);

        queryParams = { ...queryParams, ...filterQuery };
      }

      if (select) {
        let selectQuery = selectToString(select);

        queryParams = { ...queryParams, ...selectQuery };
      }

      if (populate && Array.isArray(populate)) {
        queryParams.populate = populate.join(',');
      }

      [error, remoteSubmissions] = await to(
        formio.loadSubmissions({
          params: queryParams
        })
      );
      if (error) {
        let path;

        switch (path) {
          case 'custom':
            path = await config.get().baseURL;
            break;
          case undefined:
            path = await config.get().url;
            break;
          default:
            path = await config.get().baseURL;
            path = path + '/' + path;
            break;
        }
        let e = 'The API call to "' + path + '" could not be completed, server responded with ' + JSON.stringify(error);

        throw new Error(e);
      }

      return remoteSubmissions;
    }

    async function findOne ({ filter }) {}

    async function remove ({ id }) {
      let formio = await getFormioInstance({ path: path, submissionID: id });
      let a = await formio.deleteSubmission();
    }

    async function softDelete ({ id }) {
      let formio = await getFormioInstance({ path: path, submissionID: id });
      let original = await formio.loadSubmission();

      original.data.enabled = false;
      let data = original.data;
      let softDeleted = await formio.saveSubmission({
        _id: id,
        data
      });

      return softDeleted;
    }

    async function insert ({ element }) {
      let formio = await getFormioInstance({ path: path });

      Formio.deregisterPlugin('offline');
      let sub = await formio.saveSubmission(element);

      return sub;
    }

    async function update ({ document }) {
      let formio = await getFormioInstance({ path: path });

      Formio.deregisterPlugin('offline');
      let sub = await formio.saveSubmission(document);

      return sub;
    }

    async function updateOrCreate ({ document }) {}

    async function findAndRemove ({ filter }) {}

    return Object.freeze({
      find,
      findOne,
      remove,
      insert,
      update,
      updateOrCreate,
      findAndRemove,
      getFormioInstance,
      softDelete,
      all
    });
  })();

export default remoteModel;
*/