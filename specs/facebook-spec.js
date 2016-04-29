'use strict';

const lib = require('../authentication/lib');
const slsAuth = require('serverless-authentication');
const utils = slsAuth.utils;
const config = slsAuth.config;
const nock = require('nock');
const expect = require('chai').expect;
const url = require('url');
const dynamo = require('./dynamo');

describe('Authentication Provider', () => {
  describe('Facebook', () => {
    before(() => {
      dynamo.init();
      const providerConfig = config({ provider: 'facebook' });
      nock('https://graph.facebook.com')
        .get('/v2.3/oauth/access_token')
        .query({
          client_id: providerConfig.id,
          redirect_uri: providerConfig.redirect_uri,
          client_secret: providerConfig.secret,
          code: 'code'
        })
        .reply(200, {
          access_token: 'access-token-123'
        });

      nock('https://graph.facebook.com')
        .get('/me')
        .query({ access_token: 'access-token-123', fields: 'id,name,picture,email' })
        .reply(200, {
          id: 'user-id-1',
          name: 'Eetu Tuomala',
          email: 'email@test.com',
          picture: {
            data: {
              is_silhouette: false,
              url: 'https://avatars3.githubusercontent.com/u/4726921?v=3&s=460'
            }
          }
        });
    });

    let state = '';

    it('should return oauth signin url', (done) => {
      const event = {
        provider: 'facebook'
      };

      lib.signinHandler(event, (error, data) => {
        if (!error) {
          const query = url.parse(data.url, true).query;
          state = query.state;
          expect(error).to.be.null();
          expect(data.url).to.match(/https:\/\/www\.facebook\.com\/dialog\/oauth\?client_id=fb-mock-id&redirect_uri=https:\/\/api-id\.execute-api\.eu-west-1\.amazonaws\.com\/dev\/callback\/facebook&scope=email&state=.{64}/);
        }
        done(error);
      });
    });

    it('should return local client url', (done) => {
      const event = {
        provider: 'facebook',
        code: 'code',
        state
      };

      const providerConfig = config(event);
      lib.callbackHandler(event, (error, data) => {
        if (!error) {
          const query = url.parse(data.url, true).query;
          expect(query.authorization_token).to.match(/[a-zA-Z0-9\-_]+?\.[a-zA-Z0-9\-_]+?\.([a-zA-Z0-9\-_]+)?/);
          expect(query.refresh_token).to.match(/[A-Fa-f0-9]{64}/);
          const tokenData = utils.readToken(query.authorization_token, providerConfig.token_secret);
          expect(tokenData.id)
            .to.equal('ddc94e8ba6752df42ddad3af5336670f2039c1c673d9bdec4bac56acc89b459b');
          expect(tokenData.id).to.equal(query.id);
        }
        done(error);
      });
    });
  });
});
