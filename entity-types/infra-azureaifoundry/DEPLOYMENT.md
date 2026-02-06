# Azure AI Foundry Entity Definitions - Deployment Guide

## Overview
This guide documents the complete setup for Azure AI Foundry entity definitions in New Relic, including entity synthesis, metrics, dashboards, and UI configurations.

## Files Created

### 1. Entity Type Definition Files
Location: `entity-types/azureaifoundry/`

- **definition.yml** - Core entity synthesis configuration
  - Domain: INFRA
  - Type: AZUREAIFOUNDRY
  - Entity Expiration: DAILY
  - Filters: `azure.resourceType='microsoft.cognitiveservices/accounts'` AND `azure.resourceKind='aiservices'`
  - Owner: Cloud Monitoring Platform team

- **golden_metrics.yml** - 4 primary metrics for entity summary
  - azureOpenAIRequests: Total OpenAI API requests
  - totalTokens: Total tokens processed
  - latency: Average request latency (ms)
  - availabilityRate: Service availability percentage

- **summary_metrics.yml** - 7 supporting metrics for list view
  - successRate: Request success rate percentage
  - tokensPerSecond: Token processing throughput
  - processedPromptTokens: Input token count
  - generatedTokens: Output token count
  - References golden metrics for reuse

### 2. Updated Cognitive Services Definition
Location: `entity-types/infra-azurecognitiveservice/definition.yml`

Added 22 explicit synthesis rules to prevent AI Foundry resources from matching:
- Rule for resources without resourceKind attribute
- 21 rules for specific Cognitive Services kinds (excludes 'aiservices')

## Pre-Deployment Verification (Run These NOW)

### 1. Validate Azure Metrics Exist
```nrql
FROM Metric 
SELECT count(*) 
WHERE azure.resourceType = 'microsoft.cognitiveservices/accounts' 
AND azure.resourceKind = 'aiservices'
FACET azure.resourceKind 
SINCE 1 day ago
```

**Expected**: Count > 0 for resourceKind='aiservices'
**If zero**: No aiservices resources are sending metrics - deployment won't create any entities

### 2. Check Metric Namespace
```nrql
FROM Metric 
SELECT uniqueCount(metricName) 
WHERE azure.resourceType = 'microsoft.cognitiveservices/accounts' 
AND azure.resourceKind = 'aiservices' 
AND metricName LIKE 'azure.cognitiveservices.accounts.%'
SINCE 1 day ago
```

**Expected**: Multiple unique metric names including TotalCalls, SuccessfulCalls, Latency, TotalTokens

### 3. Identify Affected Resources (Current AZURECOGNITIVESERVICE entities)

**🔍 IMPORTANT**: Display names in the UI differ from entity type names in NRQL!
- UI shows: "Cognitive services" (friendly name)
- NRQL uses: `AZURECOGNITIVESERVICE` (actual entity type - but may vary by account)

**🚨 TROUBLESHOOTING: No "Entity" event type in your account?**

If `SHOW EVENT TYPES` doesn't return "Entity", your account may not have entity synthesis enabled yet. **Use these alternative queries that check Metric data instead**:

**Step 3a (Alternative): Check Metric data for entity.type tags**
```nrql
FROM Metric
SELECT count(*)
WHERE entity.type IS NOT NULL
FACET entity.type
SINCE 7 days ago
LIMIT 100
```
**Look for**: `AZURECOGNITIVESERVICE` in the results

**Step 3b (Alternative): Check specifically for AZURECOGNITIVESERVICE metrics**
```nrql
FROM Metric
SELECT count(*), latest(azure.resourceKind) as 'Resource Kind'
WHERE entity.type = 'AZURECOGNITIVESERVICE'
FACET azure.resourceKind
SINCE 7 days ago
```
**Look for**: Does `'aiservices'` appear in the results?
- **If YES** → Resources will have duplicates during Phase 1-2 → Use **Path B: 3-Phase Deployment**
- **If NO** (only other kinds like 'ComputerVision', 'TextAnalytics', etc.) → Use **Path A: Simplified Deployment**
- **If this returns 0 results** → No Cognitive Services at all → Use **Path A: Simplified Deployment**

---

**If "Entity" event type DOES exist in your account, use these queries instead**:

**Step 3a (Standard): Find ALL entities in your account (simplified)**
```nrql
FROM Entity
SELECT count(*)
FACET entity.type
SINCE 7 days ago
LIMIT 100
```
**Look for**: Any entity type containing "COGNITIVE" or "AZURE" in the name

**⚠️ If this returns "No events found"**: See Step 3d (Manual UI Method) below - it's the most reliable way to find the exact entity type name.

**Step 3b: Find all INFRA domain entities**
```nrql
FROM Entity
SELECT count(*)
WHERE domain = 'INFRA'
FACET entity.type
SINCE 7 days ago
LIMIT 100
```
**Look for**: Azure-related entity types

**Step 3c: Check specific entity type (if you found it in 3a/3b)**
Replace `YOUR_ENTITY_TYPE` with the actual type from steps 3a or 3b:
```nrql
FROM Entity 
SELECT count(*), latest(entity.name) as 'Example Entity'
WHERE entity.type = 'YOUR_ENTITY_TYPE'
FACET tags.azure.resourceKind
SINCE 1 day ago
```
**Example**: If you found `INFRA-AZURECOGNITIVESERVICE` or `AZURECOGNITIVESERVICE`, use that

**Step 3d: Manual check in Explorer (EASIEST METHOD)**
1. Open New Relic → All Entities (Explorer)
2. Find a "Cognitive services" entity in the list
3. Click on it to open entity details
4. Look at the entity metadata/tags section for:
   - `entity.type` (the actual type name to use in NRQL)
   - `tags.azure.resourceKind` (look for 'aiservices')
5. Copy the exact `entity.type` value to use in queries above

---

**📊 DEPLOYMENT DECISION**:

**Based on Step 3b results:**

**If you found `aiservices` in the resourceKind facet**:
- ⚠️ Resources will have BOTH entity types during Phase 1-2 (proceed with 3-phase plan)
- ⚠️ Breaking change in Phase 3 when duplicates are removed
- ⚠️ Existing customer dashboards/alerts may be affected
- 📋 Use **Path B: Full 3-Phase Deployment** (5-6 weeks)

**If NO `aiservices` in results** (only other kinds like 'ComputerVision', 'TextAnalytics', etc.):
- ✅ **GOOD NEWS**: No duplicates will be created
- ✅ **SIMPLIFIED DEPLOYMENT**: Skip phased approach
- ✅ This is the ideal scenario - clean deployment with no migration needed
- 📋 Use **Path A: Simplified Deployment** (1-2 days)

**If 0 results returned** (no AZURECOGNITIVESERVICE metrics at all):
- ✅ **GOOD NEWS**: No existing resources to migrate
- 📋 Use **Path A: Simplified Deployment** (1-2 days)

---

**📝 QUICK DECISION SUMMARY**:
- **`aiservices` found** → Use **Path B: Full 3-Phase Deployment**
- **No `aiservices`** → Use **Path A: Simplified Deployment**

### 4. Verify No Existing AZUREAIFOUNDRY Entities
```nrql
FROM Entity 
SELECT count(*) 
WHERE entity.type = 'AZUREAIFOUNDRY' 
SINCE 3 hours ago
```

**Expected**: Count = 0 (before deployment)
**If NOT zero**: Entity type already exists - check with team before proceeding

## Deployment Strategy: Phased Rollout

**🎯 CHOOSE YOUR DEPLOYMENT PATH**:

### Path A: Simplified Deployment (No Existing Entities)
**Use this if**: Pre-Deployment Check #3 returned 0 AZURECOGNITIVESERVICE entities

✅ **Benefits**: 
- No duplicates, no migration, no breaking changes
- Deploy all 3 repos at once
- Entities appear immediately after synthesis
- Total time: 1-2 days

📋 **Steps**: [Skip to Simplified Deployment](#simplified-deployment-path-a)

---

### Path B: Full 3-Phase Rollout (Existing Entities)
**Use this if**: Pre-Deployment Check #3 found AZURECOGNITIVESERVICE entities with 'aiservices'

⚠️ **Required**: 
- Phased approach to minimize customer impact
- Migration period for existing dashboards/alerts
- Controlled removal of duplicates
- Total time: 5-6 weeks

📋 **Steps**: [Continue to 3-Phase Deployment](#3-phase-deployment-path-b)

---

## Simplified Deployment (Path A)

**Prerequisites**: No AZURECOGNITIVESERVICE entities exist (confirmed in Pre-Deployment Check #3)

### Step A.1: Deploy All Repositories

Deploy all 3 repositories in sequence (same day):

1. **entity-definitions**:
   ```bash
   cd /Users/vgandhari/code/entity-definitions
   git add entity-types/azureaifoundry/
   git commit -m "feat: Add AZUREAIFOUNDRY entity type"
   # Create PR, get approval, merge
   ```

2. **entity-type-ui-definitions-service**:
   ```bash
   cd /Users/vgandhari/code/entity-type-ui-definitions-service
   git add entity-type-ui-definitions/definitions/azureaifoundry/
   git commit -m "feat: Add UI definition for AZUREAIFOUNDRY"
   # Create PR, get approval, merge
   ```

3. **infra-summary**:
   ```bash
   cd /Users/vgandhari/code/infra-summary
   git add nerdlets/generic-overview/templates/metrics/AZUREAIFOUNDRY.json
   git commit -m "feat: Add metrics template for AZUREAIFOUNDRY"
   # Create PR, get approval, merge
   ```

### Step A.2: Verification (2 Hours After entity-definitions Merge)

1. **Confirm Entities Created**:
   ```nrql
   FROM Entity 
   SELECT count(*) 
   WHERE entity.type = 'AZUREAIFOUNDRY'
   SINCE 3 hours ago
   ```
   **Expected**: Count > 0

2. **Check Entity Details**:
   ```nrql
   FROM Entity 
   SELECT entity.guid, entity.name, tags.azure.resourceKind, tags.azure.resourceId
   WHERE entity.type = 'AZUREAIFOUNDRY'
   LIMIT 10
   ```
   **Expected**: Entities with resourceKind='aiservices'

3. **Verify Dashboard Template Works**:
   - Navigate to an AZUREAIFOUNDRY entity in Explorer
   - Confirm metrics widgets display data

✅ **Done!** Your deployment is complete.

---

## 3-Phase Deployment (Path B)

**Prerequisites**: AZURECOGNITIVESERVICE entities exist with 'aiservices' resources

To minimize customer impact, we'll use a **3-phase approach** with overlap periods to ensure continuity.

### Overview
- **Phase 1 (Week 1-2)**: Create AZUREAIFOUNDRY entities alongside existing AZURECOGNITIVESERVICE entities (duplicates)
- **Phase 2 (Week 3-4)**: Customer migration period - both entity types available
- **Phase 3 (Week 5+)**: Remove AZURECOGNITIVESERVICE for aiservices resources

### Customer Impact Analysis
**Affected Customers**: Anyone using `resourceKind='aiservices'` resources currently matched as AZURECOGNITIVESERVICE

**Potential Breakages**:
- Dashboards filtering by `entity.type = 'AZURECOGNITIVESERVICE'`
- Alerts configured on AZURECOGNITIVESERVICE entities
- Saved NRQL queries with entity type filters
- Custom integrations using entity GUIDs
- Workload definitions and tags

## Phase 1: Dual Entity Creation (Week 1-2)

**Goal**: Create AZUREAIFOUNDRY entities without removing AZURECOGNITIVESERVICE matches

**🚨 CRITICAL**: The AZURECOGNITIVESERVICE definition.yml in the repo **already has the exclusion rules**. 
- ⚠️ **DO NOT deploy these changes in Phase 1**
- ⚠️ Only deploy AZUREAIFOUNDRY entity type in Phase 1
- ⚠️ AZURECOGNITIVESERVICE changes are for Phase 3 (after migration period)

**Why the delay?**
- The updated AZURECOGNITIVESERVICE definition has 22 rules that exclude 'aiservices'
- If deployed now, no duplicates would be created (good for clean deployment, bad for migration)
- We need duplicates during Phase 1-2 so existing customers aren't broken
- Phase 3 deployment of AZURECOGNITIVESERVICE will remove duplicates after migration

**Git Strategy for Phase 1**:
- Commit only the `entity-types/infra-azureaifoundry/` directory
- Do NOT commit `entity-types/infra-azurecognitiveservice/` changes
- Keep AZURECOGNITIVESERVICE changes staged/uncommitted for Phase 3

### Step 1.1: Deploy AZUREAIFOUNDRY Entity Type (entity-definitions)

1. **Commit AZUREAIFOUNDRY Only** (DO NOT commit AZURECOGNITIVESERVICE changes)
   ```bash
   cd /Users/vgandhari/code/entity-definitions
   git add entity-types/infra-azureaifoundry/
   # ⚠️ CRITICAL: Do NOT add infra-azurecognitiveservice/ at all!
   # If you accidentally have it staged, unstage it:
   git restore --staged entity-types/infra-azurecognitiveservice/
   git status  # Should only show azureaifoundry/ staged
   ```

2. **Create Pull Request**
   ```
   Title: feat: Add AZUREAIFOUNDRY entity type for Azure AI Services (Phase 1)
   
   Description:
   - New entity type for Azure AI Foundry (resourceKind=aiservices)
   - Domain: INFRA, Daily expiration for fast iteration
   - Golden metrics: totalCalls, successfulCalls, latency, successRate, totalTokens, serverErrors
   - Summary metrics: 13 model-agnostic metrics supporting OpenAI, Vision, Speech, Language
   
   Phase 1 - Dual Entity Period:
   - Creates AZUREAIFOUNDRY entities for aiservices resources
   - DOES NOT modify AZURECOGNITIVESERVICE (resources will have BOTH entity types)
   - Both have DAILY expiration - safe overlap period
   - Allows customers to migrate dashboards/alerts at their own pace
   
   Impact:
   - aiservices resources will have TWO entities temporarily
   - No breaking changes for existing customers
   - New entity type available for early adopters
   ```

3. **Wait for Approval & Merge**
   - Primary Owner (Cloud Monitoring Platform) must approve
   - Entity Platform team review required

4. **Wait 2 Hours Post-Merge**
   - Entity synthesis runs on schedule
   - AZUREAIFOUNDRY entities begin appearing
   - AZURECOGNITIVESERVICE entities remain unchanged

### Step 1.2: Deploy UI Definitions (entity-type-ui-definitions-service)

1. **Commit & Deploy**
   ```bash
   cd /Users/vgandhari/code/entity-type-ui-definitions-service
   git add entity-type-ui-definitions/definitions/azureaifoundry/
   git commit -m "feat: Add UI definition for AZUREAIFOUNDRY entity type (Phase 1)"
   ```

2. **Verify UI**
   - Check "Azure" category contains "AI Foundry" entities
   - Verify entity details page renders correctly

### Step 1.3: Deploy Dashboard Templates (infra-summary)

1. **Commit & Deploy**
   ```bash
   cd /Users/vgandhari/code/infra-summary
   git add nerdlets/generic-overview/templates/metrics/AZUREAIFOUNDRY.json
   git commit -m "feat: Add metrics template for AZUREAIFOUNDRY entities (Phase 1)"
   ```

### Step 1.4: Verification (Week 1 - Run 2 Hours AFTER Deployment)

**⏰ Wait 2 hours after merge before running these queries**

1. **Confirm Dual Entities Exist**
   ```nrql
   FROM Entity 
   SELECT count(*) 
   WHERE entity.type IN ('AZURECOGNITIVESERVICE', 'AZUREAIFOUNDRY')
   FACET entity.type 
   SINCE 3 hours ago
   ```
   **Expected**: Both AZURECOGNITIVESERVICE and AZUREAIFOUNDRY counts
   **If only AZURECOGNITIVESERVICE**: Wait longer (synthesis runs every 2 hours)
   
   **Alternative - Check aiservices specifically**:
   ```nrql
   FROM Entity 
   SELECT count(*), latest(tags.azure.resourceKind) as 'Resource Kind'
   WHERE entity.type IN ('AZURECOGNITIVESERVICE', 'AZUREAIFOUNDRY')
   FACET entity.type
   SINCE 3 hours ago
   ```

2. **Same Resource, Different GUIDs**
   ```nrql
   FROM Entity 
   SELECT entity.guid, entity.type, entity.name, tags.azure.resourceId, tags.azure.resourceKind
   WHERE entity.type = 'AZUREAIFOUNDRY'
   LIMIT 10
   ```
   **Expected**: AZUREAIFOUNDRY entities with resourceKind='aiservices'
   
   **Check for duplicates**:
   ```nrql
   FROM Entity 
   SELECT count(*)
   WHERE entity.type IN ('AZURECOGNITIVESERVICE', 'AZUREAIFOUNDRY')
   FACET tags.azure.resourceId, entity.type
   LIMIT 100
   ```
   **Expected**: Some resourceIds appear twice (once for each entity type)

3. **Verify No Impact to Existing Queries**
   ```nrql
   FROM Entity 
   SELECT count(*) 
   WHERE entity.type = 'AZURECOGNITIVESERVICE' 
   SINCE 24 hours ago
   ```
   **Expected**: Count unchanged from before deployment

## Phase 2: Customer Migration Period (Week 3-4)

**Goal**: Give customers time to migrate to AZUREAIFOUNDRY

### Step 2.1: Customer Communication (Week 2-3)

1. **Send Migration Notice**
   - Target: Customers with `resourceKind='aiservices'` resources
   - Timeline: 2-4 weeks to migrate
   - Migration guide with query translation examples

2. **Documentation Updates**
   - Update docs to recommend AZUREAIFOUNDRY for new dashboards
   - Provide migration examples

### Step 2.2: Migration Guide for Customers

**Dashboard Migration**:
```nrql
# Old query (still works during Phase 2)
FROM Entity 
SELECT * 
WHERE entity.type = 'AZURECOGNITIVESERVICE'
# Note: This will include all Cognitive Services kinds during Phase 1-2
# To filter only aiservices, check tags.azure.resourceKind in results

# New query (recommended - cleaner)
FROM Entity 
SELECT * 
WHERE entity.type = 'AZUREAIFOUNDRY'

# Transition query (works in all phases)
FROM Entity 
SELECT * 
WHERE entity.type IN ('AZURECOGNITIVESERVICE', 'AZUREAIFOUNDRY')
# Filter by resourceKind in visualization if needed
```

**Alert Migration**:
- Update alert conditions to use `entity.type = 'AZUREAIFOUNDRY'`
- Test alerts in non-production first
- Keep old alerts active until Phase 3

### Step 2.3: Monitor Migration Progress (Week 3-4)

1. **Track Dashboard Usage**
   ```nrql
   # Count queries still using old entity type
   FROM NrDailyUsage 
   WHERE productLine = 'Dashboards' 
   AND usageMetric = 'DashboardQuery'
   FACET query 
   WHERE query LIKE '%AZURECOGNITIVESERVICE%'
   AND query LIKE '%aiservices%'
   ```

2. **Identify Remaining Dependencies**
   - Contact customers still using AZURECOGNITIVESERVICE for aiservices
   - Offer migration assistance

3. **Go/No-Go Decision Point (End of Week 4)**
   - ✅ Proceed to Phase 3 if <5% of queries use old entity type
   - ❌ Extend Phase 2 if >5% still using old entity type

## Phase 3: Remove Duplicate Entities (Week 5+)

**Goal**: Clean up - remove AZURECOGNITIVESERVICE entities for aiservices resources

**✅ NOTE**: The AZURECOGNITIVESERVICE definition.yml **already has the Phase 3 changes built in!**
- It contains 22 explicit synthesis rules for specific Cognitive Services kinds
- **No rule exists for `aiservices`** - it's already excluded
- This file was created with the complete migration strategy in mind

### Step 3.1: Final Migration Reminder (Week 5)

1. **Last Call Communication**
   - Email customers still using old entity type
   - 1 week final deadline
   - Highlight breaking change date

### Step 3.2: Deploy AZURECOGNITIVESERVICE Changes

**🎯 CRITICAL**: Even though the definition.yml is already correct, it was **NOT deployed in Phase 1** to allow for the migration period.

**Why we delayed this deployment**:
- Phase 1: Only deployed AZUREAIFOUNDRY (creates duplicates)
- Phase 2: Migration period (both entity types coexist)
- **Phase 3**: Now deploy the updated AZURECOGNITIVESERVICE (removes duplicates)

1. **Commit Changes**
   ```bash
   cd /Users/vgandhari/code/entity-definitions
   git add entity-types/infra-azurecognitiveservice/definition.yml
   git commit -m "feat: Exclude aiservices from AZURECOGNITIVESERVICE (Phase 3)"
   ```

2. **Create Pull Request**
   ```
   Title: feat: Deploy AZURECOGNITIVESERVICE with aiservices exclusion (Phase 3)
   
   Description:
   - Deploy updated AZURECOGNITIVESERVICE definition (already prepared in repo)
   - Contains 22 explicit rules for specific Cognitive Services kinds (excludes 'aiservices')
   - Completes migration to AZUREAIFOUNDRY entity type
   
   Phase 3 - Cleanup:
   - AZURECOGNITIVESERVICE will no longer match aiservices resources
   - Existing AZURECOGNITIVESERVICE entities for aiservices will expire in 24 hours (DAILY)
   - Only AZUREAIFOUNDRY entities will remain for aiservices
   
   How it works:
   - 22 synthesis rules explicitly match only non-aiservices kinds
   - No rule matches resourceKind='aiservices' → only AZUREAIFOUNDRY matches
   - Clean separation with no overlap
   
   Breaking Change:
   - Customers must use entity.type = 'AZUREAIFOUNDRY' for aiservices resources
   - Migration period: 4 weeks (sufficient notice provided)
   ```

3. **Wait for Approval & Merge**

4. **Wait 24 Hours for Entity Expiration**
   - AZURECOGNITIVESERVICE synthesis stops matching aiservices resources
   - Existing AZURECOGNITIVESERVICE entities for aiservices expire in 24 hours (DAILY expiration)
   - Only AZUREAIFOUNDRY entities remain

### Step 3.3: Post-Migration Verification

1. **Confirm Single Entity Type**
   ```nrql
   FROM Entity 
   SELECT count(*) 
   WHERE entity.type = 'AZUREAIFOUNDRY'
   SINCE 3 hours ago
   ```
   **Expected**: Count of AZUREAIFOUNDRY entities
   
   **Verify no AZURECOGNITIVESERVICE with aiservices**:
   ```nrql
   FROM Entity
   SELECT count(*), latest(tags.azure.resourceKind)
   WHERE entity.type = 'AZURECOGNITIVESERVICE'
   FACET tags.azure.resourceKind
   SINCE 3 hours ago
   ```
   **Expected**: No 'aiservices' kind in results

2. **Verify AZURECOGNITIVESERVICE Still Works for Other Kinds**
   ```nrql
   FROM Entity 
   SELECT count(*) 
   WHERE entity.type = 'AZURECOGNITIVESERVICE' 
   FACET tags.azure.resourceKind 
   SINCE 3 hours ago
   ```
   **Expected**: All kinds except 'aiservices'

3. **Monitor Customer Impact**
   - Check for spike in support tickets
   - Monitor error rates in dashboards/alerts
   - Proactively reach out to affected customers

## Post-Deployment Verification (Phase 1)

**⏰ Run these 2 hours after Phase 1 deployment**

### After 2 Hours - Entity Creation Check

1. **Verify Entities Created**
   ```nrql
   SELECT count(*) 
   FROM Entity 
   WHERE entity.type = 'AZUREAIFOUNDRY' 
   SINCE 3 hours ago
   ```
   **Expected**: Count matches pre-deployment metric count

2. **Check Entity Attributes**
   ```nrql
   FROM Entity 
   SELECT * 
   WHERE entity.type = 'AZUREAIFOUNDRY' 
   LIMIT 5
   ```
   **Expected**: Entities have azure.region, azure.resourceGroup, azure.subscriptionId tags

3. **Verify Golden Metrics**
   ```nrql
   FROM Metric 
   SELECT latest(azure.cognitiveservices.accounts.AzureOpenAIRequests),
          latest(azure.cognitiveservices.accounts.TotalTokens),
          latest(azure.cognitiveservices.accounts.Latency),
          latest(azure.cognitiveservices.accounts.AzureOpenAIAvailabilityRate)
   WHERE azure.resourceType = 'microsoft.cognitiveservices/accounts' 
   AND azure.resourceKind = 'aiservices'
   FACET entity.guid
   SINCE 1 hour ago
   ```
   **Expected**: Metrics available for entity GUIDs

4. **Check for Duplicates (Phase 1-2 only)**
   ```nrql
   FROM Entity 
   SELECT count(*)
   WHERE entity.type IN ('AZURECOGNITIVESERVICE', 'AZUREAIFOUNDRY')
   FACET tags.azure.resourceId, entity.type
   LIMIT 100
   ```
   **Expected**: Some resourceIds appear twice during Phase 1-2 (acceptable - both have DAILY expiration)

5. **Verify Entity Reporting Status**
   ```nrql
   FROM Entity 
   SELECT percentage(count(*), WHERE reporting = true) 
   WHERE entity.type = 'AZUREAIFOUNDRY' 
   SINCE 1 hour ago
   ```
   **Expected**: > 95% reporting

6. **Test Dashboard Template**
   - Navigate to an AZUREAIFOUNDRY entity in Explorer
   - Verify dashboard widgets render correctly
   - Confirm all 13 widgets display data

7. **Validate Tags**
   ```nrql
   FROM Entity 
   SELECT tags.azure.region, tags.azure.resourceGroup, tags.azure.subscriptionId
   WHERE entity.type = 'AZUREAIFOUNDRY' 
   LIMIT 10
   ```
   **Expected**: Golden tags populated on entities

8. **Check Model Deployment Metrics**
   ```nrql
   FROM Metric 
   SELECT sum(azure.cognitiveservices.accounts.AzureOpenAIRequests) 
   WHERE azure.resourceType = 'microsoft.cognitiveservices/accounts' 
   AND azure.resourceKind = 'aiservices'
   FACET azure.cognitiveservices.accounts.modeldeploymentname
   SINCE 1 day ago
   ```
   **Expected**: Breakdown by model deployments

9. **Verify Summary Metrics**
   - Open Explorer list view
   - Filter to AZUREAIFOUNDRY entities
   - Confirm summary metrics display in columns

10. **Test Alert Creation**
    - Create a test alert on an AI Foundry entity
    - Verify alertable: true allows alert creation

## Known Issues & Expected Behavior

### Duplicate Entities
- **Issue**: Resources with `resourceKind='aiservices'` will have both AZURECOGNITIVESERVICE and AZUREAIFOUNDRY entities
- **Impact**: Minimal - both entity types have DAILY expiration, will coexist
- **Resolution**: Future deprecation of AZURECOGNITIVESERVICE for aiservices resources

### Entity Synthesis Schema Limitations
- **Limitation**: No support for negation in conditions (no `negate: true`, `value: !aiservices`, or `present: false`)
- **Workaround**: Used explicit enumeration of 21 Cognitive Services kinds in AZURECOGNITIVESERVICE definition
- **Alternative Attempted**: Various exclusion patterns - all unsupported by validator/schemas/entity-schema-v1.json

## Rollback Plan

### Phase 1 Rollback (if issues found in Week 1-2)

If AZUREAIFOUNDRY entities cause problems:

1. **Remove AZUREAIFOUNDRY Entity Type**
   ```bash
   git revert <commit-hash>
   # Wait 2 hours for synthesis to run
   # AZUREAIFOUNDRY entities will stop being created
   # Existing entities expire in 24 hours (DAILY expiration)
   # AZURECOGNITIVESERVICE entities remain unaffected
   ```

2. **No Customer Impact**
   - AZURECOGNITIVESERVICE entities still exist
   - Customers continue using existing dashboards/alerts
   - Safe rollback with zero downtime

### Phase 3 Rollback (if migration causes issues)

If removing AZURECOGNITIVESERVICE for aiservices causes problems:

1. **Restore AZURECOGNITIVESERVICE for aiservices**
   ```bash
   git revert <commit-hash>
   # Wait 2 hours for synthesis to run
   # AZURECOGNITIVESERVICE entities for aiservices resume creation
   # Dual entities return (both AZURECOGNITIVESERVICE and AZUREAIFOUNDRY)
   ```

2. **Extend Migration Period**
   - Communicate extended timeline to customers
   - Identify and fix remaining dependencies
   - Retry Phase 3 when ready

## Timeline Summary

| Phase | Duration | Action | Customer Impact |
|-------|----------|--------|----------------|
| **Phase 1** | Week 1-2 | Deploy AZUREAIFOUNDRY | None - dual entities |
| **Phase 2** | Week 3-4 | Customer migration | Optional - customers migrate at own pace |
| **Phase 3** | Week 5+ | Remove AZURECOGNITIVESERVICE for aiservices | Breaking - must use AZUREAIFOUNDRY |

**Total Timeline**: 5-6 weeks minimum (can extend Phase 2 if needed)

## Success Criteria

### Phase 1 Success
- ✅ AZUREAIFOUNDRY entities created for all aiservices resources
- ✅ Both entity types exist simultaneously
- ✅ No impact to existing customer dashboards/alerts
- ✅ UI definitions and templates deployed successfully

### Phase 2 Success
- ✅ >95% of customer queries migrated to AZUREAIFOUNDRY
- ✅ Migration documentation published
- ✅ Customer feedback collected and addressed
- ✅ No reported issues with AZUREAIFOUNDRY entity type

### Phase 3 Success
- ✅ Only AZUREAIFOUNDRY entities exist for aiservices resources
- ✅ AZURECOGNITIVESERVICE still works for all other resource kinds
- ✅ <5% increase in support tickets
- ✅ No critical customer escalations

## Maintenance

### Weekly Monitoring
- Check entity count trends
- Monitor duplicate entity counts
- Review dashboard usage analytics
- Validate golden metrics accuracy

### Future Enhancements
1. Add more model-specific metrics as Azure expands AI Foundry
2. Create model deployment relationship definitions
3. Add capacity and quota metrics
4. Implement cost tracking metrics
5. Deprecate AZURECOGNITIVESERVICE for aiservices (coordinate with Cloud Monitoring Platform team)

## Support Contacts
- **Primary Owner**: Cloud Monitoring Platform team
- **Entity Platform Team**: For schema/synthesis questions
- **Azure Monitor Integration**: For metric availability questions

## References
- Entity Synthesis Docs: `/docs/entities/synthesis.md`
- Golden Metrics Docs: `/docs/entities/golden_metrics.md`
- Summary Metrics Docs: `/docs/entities/summary_metrics.md`
- Entity Schema: `/validator/schemas/entity-schema-v1.json`
