'use strict';

const endpoint = process.env.LOCAL_DDB_ENDPOINT;
const project = process.env.SERVERLESS_PROJECT;
const stage = process.env.SERVERLESS_STAGE;
const region = process.env.SERVERLESS_REGION;
const table = [stage, project, 'cache'].join('-');
const resources = require(`../_meta/resources/s-resources-cf-${stage}-${region.replace(/-/g, '')}.json`).Resources;

const async = require('async');
const DynamoDB = require('aws-sdk').DynamoDB;
const db = new DynamoDB({ endpoint, region });

exports = module.exports = {
  init: () => {
    async.waterfall([
      (callback) => {
        db.listTables({}, callback);
      },
      (data, callback) => {
        const tables = data.TableNames;
        if (tables.indexOf(table) === -1) {
          db.createTable(resources.Dynamo.Properties, (err, created) => {
            if (!err) {
              callback(null, `table ${created.TableDescription.TableName} created`);
            } else {
              callback(err);
            }
          });
        } else {
          callback(null, `${table} already exists`);
        }
      }
    ], (err) => {
      if (err) {
        throw new Error(err);
      }
    });
  }
};
