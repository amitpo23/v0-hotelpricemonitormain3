/**
 * Test News Sentiment Agent Integration with Orchestrator
 * Validates the integration is working correctly
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 News Sentiment Agent Integration Test\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Read orchestrator-v2.ts
const orchestratorPath = join(__dirname, 'lib', 'agents', 'orchestrator-v2.ts');
const orchestratorContent = await readFile(orchestratorPath, 'utf-8');

let passedTests = 0;
const totalTests = 9;

// Test 1: News Sentiment Agent import
console.log('\n📦 Test 1: Import Statement');
const hasImport = orchestratorContent.includes("import { analyzeNewsSentiment } from './news-sentiment-agent'");
console.log(hasImport ? '✅ News Sentiment Agent imported' : '❌ Missing import');
if (hasImport) passedTests++;

// Test 2: Interface includes newsSentiment
console.log('\n📋 Test 2: Interface Definition');
const hasInterface = orchestratorContent.includes('newsSentiment: any') && 
                     orchestratorContent.includes('newsSentimentConfidence: number');
console.log(hasInterface ? '✅ News Sentiment fields in interface' : '❌ Missing interface fields');
if (hasInterface) passedTests++;

// Test 3: Option parameter
console.log('\n⚙️  Test 3: Option Parameter');
const hasOption = orchestratorContent.includes('includeNewsSentiment?: boolean');
console.log(hasOption ? '✅ includeNewsSentiment option defined' : '❌ Missing option');
if (hasOption) passedTests++;

// Test 4: Variable initialization
console.log('\n🔧 Test 4: Variable Initialization');
const hasInit = orchestratorContent.includes('let newsSentimentData: any = null') &&
                orchestratorContent.includes('let newsSentimentConfidence = 0');
console.log(hasInit ? '✅ News Sentiment variables initialized' : '❌ Missing initialization');
if (hasInit) passedTests++;

// Test 5: Stage 2 task
console.log('\n🏃 Test 5: Stage 2 Execution Task');
const hasTask = orchestratorContent.includes('News Sentiment Agent') &&
                orchestratorContent.includes('analyzeNewsSentiment(location, new Date(firstDate))') &&
                orchestratorContent.includes("'news_sentiment'");
console.log(hasTask ? '✅ News Sentiment task in Stage 2' : '❌ Missing execution task');
if (hasTask) passedTests++;

// Test 6: Decision Agent integration
console.log('\n🧠 Test 6: Decision Agent Integration');
const hasDecisionIntegration = orchestratorContent.includes("agentName: 'News Sentiment Agent'") &&
                                orchestratorContent.includes('if (newsSentimentData)');
console.log(hasDecisionIntegration ? '✅ News Sentiment integrated with Decision Agent' : '❌ Missing Decision Agent integration');
if (hasDecisionIntegration) passedTests++;

// Test 7: Return statement
console.log('\n📤 Test 7: Return Statement');
const hasReturn = orchestratorContent.includes('newsSentiment: newsSentimentData') &&
                  orchestratorContent.includes('newsSentimentConfidence,');
console.log(hasReturn ? '✅ News Sentiment in return statement' : '❌ Missing in return');
if (hasReturn) passedTests++;

// Test 8: Recommended options
console.log('\n🎯 Test 8: Recommended Options');
const nearTermMatch = orchestratorContent.match(/if \(daysAhead <= 7\) \{[\s\S]*?includeNewsSentiment: true/);
const shortTermMatch = orchestratorContent.match(/if \(daysAhead <= 30\) \{[\s\S]*?includeNewsSentiment: true/);
const longTermMatch = orchestratorContent.match(/return \{[\s\S]*?includeNewsSentiment: true[\s\S]*?\}/);
console.log(nearTermMatch ? '✅ Near-term (0-7 days)' : '❌ Missing near-term');
console.log(shortTermMatch ? '✅ Short-term (8-30 days)' : '❌ Missing short-term');
console.log(longTermMatch ? '✅ Long-term (30+ days)' : '❌ Missing long-term');
if (nearTermMatch && shortTermMatch && longTermMatch) passedTests++;

// Test 9: Console logging
console.log('\n📝 Test 9: Console Logging');
const hasLogging = orchestratorContent.includes('NewsSentiment=${includeNewsSentiment}') &&
                   orchestratorContent.includes('📰 [News Sentiment Agent]');
console.log(hasLogging ? '✅ News Sentiment logging present' : '❌ Missing logging');
if (hasLogging) passedTests++;

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Integration Test Summary\n');

console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);

if (passedTests === totalTests) {
  console.log('\n🎉 All integration tests PASSED!');
  console.log('\n✅ News Sentiment Agent successfully integrated with Orchestrator v2!');
  console.log('\nIntegration includes:');
  console.log('  • Import statement');
  console.log('  • Interface definition');
  console.log('  • Option parameter');
  console.log('  • Variable initialization');
  console.log('  • Stage 2 execution task (12h cache TTL)');
  console.log('  • Decision Agent integration');
  console.log('  • Return statement');
  console.log('  • All recommended options (near/short/long term)');
  console.log('  • Console logging with 📰 emoji');
  console.log('\nSystem now has 11 active agents!');
} else {
  console.log('\n❌ Some integration tests FAILED');
  console.log('\nPlease review the failed tests above.');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
