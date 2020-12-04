import os
import sys
import requests
from git import Repo
from time import time

FILENAME = 'definition.yml'

def getDefsDir(relPath):
    return os.path.join("../definitions", relPath)

def getEntitySchemas(url):
    endpoint = "/v2/entity-types"
    request = requests.get(url+endpoint)
    if request.status_code == 200:
        return request.json()["entityIndexTypes"]
    else:
        raise Exception("Request failed, returning code {}.".format(request.status_code))

def createDefinition(domain, type):
    folderName = ("%s-%s" %(domain, type)).lower()
    if not os.path.exists(getDefsDir(folderName)):
        os.makedirs(getDefsDir(folderName))
        with open(os.path.join(getDefsDir(folderName), FILENAME), 'w') as temp_file:
            temp_file.write("domain: %s" % domain)
            temp_file.write("\n")
            temp_file.write("type: %s" % type)
        return 1
    else:
        return 0

def importEntityDefinitions(url):
    entitySchemas = getEntitySchemas(url)
    newDefinitions = 0
    for schema in entitySchemas:
        domain = schema['domain']
        type = schema['rawEntityType']
        newDefinitions += createDefinition(domain, type)
    print("Created %d new definitions" % newDefinitions)

def commitToNewBranch():
    repo = Repo('../')
    new_branch = repo.create_head('import-definitions-'+str(time()))
    repo.head.reference = new_branch
    repo.git.add('./definitions/')
    repo.git.commit('-m', 'Migrated new entity definitions')



if(len(sys.argv) < 2):
    exit("Please provide the URL of the schema service for the environment you wish want to use")
url = sys.argv[1]
importEntityDefinitions(url)
commitToNewBranch()

