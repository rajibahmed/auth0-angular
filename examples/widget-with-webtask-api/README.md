# Auth0 + AngularJS + API Seed

This is the seed project you need to use if you're going to create an AngularJS app that will use Auth0 and an API that you're going to be developing using webtask.io. You do not need to deploy any server for this, all that is required static hosting.

If you want to connect to a third party API like Firebase or Amazon, please check [this other seed](https://github.com/auth0/auth0-angular/tree/master/examples/widget-with-thirdparty-api).

## Running the example

In order to run the example you need to just start a server. What we suggest is doing the following:

1. Install node
2. `npm install -g wt-cli` Install the webtask CLI
3. `wt init` Create a default webtask profile for the CLI
4. `wt create --clientId <AUTH0_CLIENT_ID> --clientSecret <AUTH0_CLIENT_SECRET> --auth0Domain <tenant.auth0.com> --auth0 ./webtask/api.js`
5. `npm install -g serve`
6. `serve ./public`


Go to [http://localhost:3000](http://localhost:3000) and you'll see the app running :).
