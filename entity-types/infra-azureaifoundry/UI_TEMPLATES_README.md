# UI Templates for Azure AI Foundry

This document describes the UI definition and template files created in the other repositories.

## Repository: entity-type-ui-definitions-service

### File Created
**Location**: `/Users/vgandhari/code/entity-type-ui-definitions-service/entity-type-ui-definitions/definitions/azureaifoundry/definition_ui.yml`

**Content**:
```yaml
category: Azure
description: 'Azure AI Foundry provides unified access to AI services including Azure OpenAI, enabling enterprise AI application development.'
displayName: AI Foundry
domain: INFRA
domainName: Infrastructure
icon: hardware-and-software--software--cloud
nerdletSections:
  - name: Monitor
    nerdlets:
      - infra-summary.metrics
  - name: Triage
    nerdlets:
      - anomaly-incident-response.root-cause
  - name: Data
    nerdlets:
      - data-explorer.events
      - data-explorer.metrics
overviewNerdletId: infra-summary.overview
type: AZUREAIFOUNDRY
```

**Purpose**: Defines how the AI Foundry entity appears in the New Relic UI:
- Category: Azure (groups with other Azure entities in Explorer)
- Display Name: "AI Foundry" (shown in UI)
- Icon: Cloud icon
- Nerdlet Sections: Monitor (metrics view), Triage (root cause analysis), Data (explorer)
- Overview: Uses infra-summary.overview nerdlet

## Repository: infra-summary

### File Created (Needs Manual Edit)
**Location**: `/Users/vgandhari/code/infra-summary/nerdlets/generic-overview/templates/metrics/AZUREAIFOUNDRY.json`

**Status**: File created as copy of AZURECOGNITIVESERVICE.json - requires manual editing

**Required Changes**:
1. Update title from "Cognitive service" to "Azure AI Foundry"
2. Replace all widgets with AI Foundry-specific metrics (see below)

### Recommended Widget Configuration

The template should include 11 widgets focused on Azure OpenAI/AI Foundry metrics:

#### Row 1 (y=0)
1. **Azure OpenAI Requests** (x=0, width=6, height=4)
   - Metric: `azure.cognitiveservices.accounts.AzureOpenAIRequests`
   - Aggregations: SUM, MAX, MIN, AVERAGE
   - Type: line chart

2. **Total Tokens Processed** (x=6, width=6, height=4)
   - Metric: `azure.cognitiveservices.accounts.TotalTokens`
   - Aggregations: SUM, MAX, MIN, AVERAGE
   - Type: line chart

#### Row 2 (y=4)
3. **Latency (ms)** (x=0, width=6, height=4)
   - Metric: `azure.cognitiveservices.accounts.Latency`
   - Aggregations: AVERAGE, MAX, MIN, percentile(95)
   - Type: line chart

4. **Availability Rate (%)** (x=6, width=6, height=4)
   - Metric: `azure.cognitiveservices.accounts.AzureOpenAIAvailabilityRate`
   - Aggregations: AVERAGE, MIN, MAX
   - Type: line chart

#### Row 3 (y=8)
5. **Token Usage by Type** (x=0, width=12, height=4)
   - Metrics: 
     - `azure.cognitiveservices.accounts.ProcessedPromptTokens` AS 'Prompt Tokens'
     - `azure.cognitiveservices.accounts.GeneratedTokens` AS 'Generated Tokens'
   - Aggregation: SUM
   - Type: line chart

#### Row 4 (y=12)
6. **Success Rate (%)** (x=0, width=6, height=4)
   - Metric: `azure.cognitiveservices.accounts.SuccessRate`
   - Aggregations: AVERAGE, MIN, MAX
   - Type: line chart

7. **Requests Per Minute** (x=6, width=6, height=4)
   - Query: `rate(SUM(azure.cognitiveservices.accounts.AzureOpenAIRequests), 1 minute)`
   - Type: line chart

#### Row 5 (y=16)
8. **Tokens Per Second** (x=0, width=6, height=4)
   - Query: `rate(SUM(azure.cognitiveservices.accounts.TotalTokens), 1 second)`
   - Type: line chart

9. **Active Tokens** (x=6, width=6, height=4)
   - Metric: `azure.cognitiveservices.accounts.ActiveTokens`
   - Aggregations: SUM, MAX
   - Type: line chart

#### Row 6 (y=20)
10. **Requests by Model Deployment** (x=0, width=6, height=4)
    - Metric: `azure.cognitiveservices.accounts.AzureOpenAIRequests`
    - Aggregation: SUM
    - FACET: `azure.cognitiveservices.accounts.modeldeploymentname`
    - LIMIT: 10
    - Type: area chart

11. **Requests by Operation** (x=6, width=6, height=4)
    - Metric: `azure.cognitiveservices.accounts.AzureOpenAIRequests`
    - Aggregation: SUM
    - FACET: `azure.cognitiveservices.accounts.operationname`
    - LIMIT: 10
    - Type: area chart

### Widget Template Structure

Each widget follows this structure:
```json
{
  "name": "Widget_Name",
  "renderer": "vizco",
  "layout": {
    "height": 4,
    "width": 6,
    "x": 0,
    "y": 0
  },
  "props": {
    "type": "line",  // or "area" for faceted widgets
    "title": "Display Title",
    "hint": "",
    "query": {
      "account_id": "{{entity.accountId}}",
      "nrql": "FROM Metric SELECT ... WHERE `entity.guid` = '{{entity.id}}' TIMESERIES AUTO",
      "offset": 300000
    }
  }
}
```

### Important Query Patterns

**Basic Aggregation**:
```sql
FROM Metric 
SELECT SUM(`azure.cognitiveservices.accounts.MetricName`) AS 'Sum', 
       MAX(`azure.cognitiveservices.accounts.MetricName`) AS 'Max', 
       MIN(`azure.cognitiveservices.accounts.MetricName`) AS 'Min', 
       AVERAGE(`azure.cognitiveservices.accounts.MetricName`) AS 'Avg' 
WHERE `entity.guid` = '{{entity.id}}' 
TIMESERIES AUTO
```

**Rate Calculation**:
```sql
FROM Metric 
SELECT rate(SUM(`azure.cognitiveservices.accounts.MetricName`), 1 minute) AS 'Requests/min' 
WHERE `entity.guid` = '{{entity.id}}' 
TIMESERIES AUTO
```

**Faceted Query**:
```sql
FROM Metric 
SELECT SUM(`azure.cognitiveservices.accounts.AzureOpenAIRequests`) 
WHERE `entity.guid` = '{{entity.id}}' 
FACET azure.cognitiveservices.accounts.facetAttribute 
TIMESERIES AUTO 
LIMIT 10
```

## Deployment Checklist

### entity-type-ui-definitions-service Repository
- [x] Created definition_ui.yml for AZUREAIFOUNDRY
- [ ] Commit and push changes
- [ ] Create PR with title: "feat: Add UI definition for Azure AI Foundry entity type"
- [ ] Wait for approval and merge

### infra-summary Repository  
- [x] Created AZUREAIFOUNDRY.json template (placeholder)
- [ ] Manually edit template to replace Cognitive Services widgets with AI Foundry widgets
- [ ] Test template locally if possible
- [ ] Commit and push changes
- [ ] Create PR with title: "feat: Add generic-overview metrics template for Azure AI Foundry"
- [ ] Wait for approval and merge

### entity-definitions Repository (Main)
- [x] All entity definition files created
- [ ] Commit and push changes (see DEPLOYMENT.md)

## Testing After Deployment

Once all three repositories are deployed:

1. **Verify Entity UI Category**:
   - Open New Relic Explorer
   - Check "Azure" category contains "AI Foundry" entities
   - Verify icon displays correctly

2. **Test Entity Overview**:
   - Click on an AI Foundry entity
   - Verify "Monitor", "Triage", and "Data" tabs appear
   - Click Monitor → Metrics
   - Confirm all 11 widgets render with data

3. **Validate Widget Queries**:
   - Check each widget displays data
   - Verify faceted widgets show model deployments and operations
   - Confirm tooltips and legends work correctly

## Notes

- The UI definition uses the standard infra-summary nerdlets (no custom nerdlet needed)
- The metrics template is entity-specific (uses `entity.guid` filter)
- All Azure INFRA entities use the same icon: `hardware-and-software--software--cloud`
- Template offset of 300000ms (5 minutes) is standard for near-real-time monitoring
