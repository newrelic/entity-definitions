const { findRedundantKeys, validateCandidate } = require('./validate_candidate_attribute_keys');

test('findRedundantKeys flags tag keys that differ only by case', () => {
  expect(findRedundantKeys(['tags.aws.Arn', 'tags.aws.arn', 'tags.aws.region']))
    .toEqual([['tags.aws.Arn', 'tags.aws.arn']]);
});

test('findRedundantKeys flags exact duplicates', () => {
  expect(findRedundantKeys(['tags.a', 'tags.a'])).toEqual([['tags.a', 'tags.a']]);
});

test('findRedundantKeys accepts distinct tags', () => {
  expect(findRedundantKeys(['tags.aws.rds.dbClusterIdentifier', 'tags.aws.dbClusterIdentifier'])).toEqual([]);
});

test('findRedundantKeys flags non-tag keys that differ only by case', () => {
  expect(findRedundantKeys(['url', 'URL'])).toEqual([['url', 'URL']]);
});

test('validateCandidate reports offending lookups', () => {
  const candidate = {
    lookups: [{ attributes: { predicates: [{ attributeKeys: ['tags.x', 'tags.X'], field: 'f' }] } }]
  };
  expect(validateCandidate(candidate)).toHaveLength(1);
});
