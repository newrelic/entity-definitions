# Validate entity synthesis definitions

The scripts in this folder validate the definition files for entities and composite metrics. These validations are executed automatically in each pull request.

## How validation occurs

The following validations are applied to the entity definition files:

1. Schema validation: Checks for structural errors in the files, like missing required properties or invalid values.
2. Uniqueness: Checks that the same attribute name and conditions are not used for the *identifier* of entity definitions with a different domain and type. 

For the summary and golden metrics definitions only the schema validation applies. 

If you want to validate definition files manually, for example before opening a pull request, just put the file in a folder under `definitions` and run the validation locally as explained [here](#running-via-docker).


### Running via docker

1. Install [Docker](https://www.docker.com/products/docker-desktop)
2. Execute the following command:

```
docker-compose run validate-definitions
```

If you added or modified a dashboard and its validation is failing you can try to fix it by running the following:

```
docker-compose run sanitize-dashboards
```

### Local setup

You can run it using `npm`:

1. Install [NodeJS](https://nodejs.org/en/) we use [nvm](https://github.com/nvm-sh/nvm) to keep nodejs versions up to date.
2. Clone this repository.
4. If you are using nvm: `nvm install && nvm use`
5. Ensure you have the latest npm version `npm install -g npm@latest`
6. Run `npm --prefix validator install`.
7. Run `npm --prefix validator run check`.

You can also run each of the validation tools independently:

```sh
npm  --prefix validator run validate-schemas
npm  --prefix validator run validate-rules
npm  --prefix validator run validate-folders
```

The tool expects all definition files to be in a subfolder under the `definitions` folder.

If you added or modified a dashboard and its validation is failing you can try to fix it with:

```sh
npm  --prefix validator run sanitize-dashboards
```
