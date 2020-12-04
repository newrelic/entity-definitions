# Migrate definitions

The `migrateDefinitions` script will create non-synthesizable entity definitions on the [definitions](../definitions) folder based on the entities defined internally. 
Then it will create a new branch, stage and commit the changes, so that you can verify that everything is correct and just push. 

## Execute the script

Create a virtual environment with python 3.x to execute the script

```bash
virtualenv venv -p python3.8
```

Activate the environment

```bash
source venv/bin/activate
```

Install the dependencies

```bash
pip install -r requirements.txt
```

Execute the `migrateDefinitions` script providing the URL of the schema registry in the environment you wish to import the definitions from:

```bash
python3 migrateDefinitions.py <SERVICE_URL>
```
