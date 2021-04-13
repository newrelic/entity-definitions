# Validate entity synthesis definitions

The scripts in this folder validate the definition files for entities and composite metrics. These validations are executed automatically in each pull request.

## How validation occurs

The following validations are applied to the entity definition files:

1. Schema validation: Checks for structural errors in the files, like missing required properties or invalid values.
2. Uniqueness: Checks that the same attribute name and conditions are not used for the *identifier* of entity definitions with a different domain and type. 

For the summary and golden metrics definitions only the schema validation applies. 

If you want to validate definition files manually, for example before opening a pull request, just put the file in a folder under `definitions` and run the validation locally as explained [here](#local-setup).

### Local setup

You can run it using `npm`:

1. Install [NodeJS](https://nodejs.org/en/).
2. Clone this repository.
3. Run `npm --prefix validator install`.
4. Run `npm --prefix validator run check`.

You can also run each of the validation tools independently:

```sh
npm  --prefix validator run validate-schemas
npm  --prefix validator run validate-uniqueness
```

The tool expects all definition files to be in a subfolder under the `definitions` folder.
