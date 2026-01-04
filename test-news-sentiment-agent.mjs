/**
 * Test News Sentiment Agent Structure
 * Validates the agent without making real API calls
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 News Sentiment Agent Structure Test\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Read news-sentiment-agent.ts
const agentPath = join(__dirname, 'lib', 'agents', 'news-sentiment-agent.ts');
const agentContent = await readFile(agentPath, 'utf-8');

let passedTests = 0;
const totalTests = 10;

// Test 1: Main function export
console.log('\n📦 Test 1: Main Function Export');
const hasMainExport = agentContent.includes('export async function analyzeNewsSentiment');
console.log(hasMainExport ? '✅ analyzeNewsSentiment export found' : '❌ Missing main export');
if (hasMainExport) passedTests++;

// Test 2: NewsArticle interface
console.log('\n📋 Test 2: NewsArticle Interface');
const hasNewsArticle = agentContent.includes('interface NewsArticle') &&
                        agentContent.includes('title: string') &&
                        agentContent.includes('sentiment?:');
console.log(hasNewsArticle ? '✅ NewsArticle interface complete' : '❌ Missing NewsArticle interface');
if (hasNewsArticle) passedTests++;

// Test 3: NewsSentimentData interface
console.log('\n📊 Test 3: NewsSentimentData Interface');
const hasDataInterface = agentContent.includes('interface NewsSentimentData') &&
                         agentContent.includes('sentimentSummary:') &&
                         agentContent.includes('tourismImpact:');
console.log(hasDataInterface ? '✅ NewsSentimentData interface complete' : '❌ Missing data interface');
if (hasDataInterface) passedTests++;

// Test 4: fetchNewsData function
console.log('\n🌐 Test 4: fetchNewsData Function');
const hasFetchFunction = agentContent.includes('async function fetchNewsData(');
console.log(hasFetchFunction ? '✅ fetchNewsData function found' : '❌ Missing fetch function');
if (hasFetchFunction) passedTests++;

// Test 5: analyzeSentiment function
console.log('\n🎭 Test 5: analyzeSentiment Function');
const hasAnalyzeFunction = agentContent.includes('function analyzeSentiment(') &&
                           agentContent.includes('positive:') &&
                           agentContent.includes('negative:') &&
                           agentContent.includes('avgScore:');
console.log(hasAnalyzeFunction ? '✅ analyzeSentiment function complete' : '❌ Missing analyze function');
if (hasAnalyzeFunction) passedTests++;

// Test 6: calculateTourismImpact function
console.log('\n💰 Test 6: calculateTourismImpact Function');
const hasImpactFunction = agentContent.includes('function calculateTourismImpact(');
console.log(hasImpactFunction ? '✅ calculateTourismImpact function found' : '❌ Missing impact function');
if (hasImpactFunction) passedTests++;

// Test 7: generateRecommendation function
console.log('\n💡 Test 7: generateRecommendation Function');
const hasRecommendation = agentContent.includes('function generateRecommendation(');
console.log(hasRecommendation ? '✅ generateRecommendation function found' : '❌ Missing recommendation function');
if (hasRecommendation) passedTests++;

// Test 8: AgentOutput type import
console.log('\n🔗 Test 8: AgentOutput Import');
const hasAgentOutput = agentContent.includes("import type { AgentOutput } from './decision-agent'");
console.log(hasAgentOutput ? '✅ AgentOutput type imported' : '❌ Missing AgentOutput import');
if (hasAgentOutput) passedTests++;

// Test 9: Location-specific mock data
console.log('\n🗺️  Test 9: Location-Specific Logic');
const hasLocationLogic = agentContent.includes('tel aviv') &&
                         agentContent.includes('jerusalem') &&
                         agentContent.includes('eilat');
console.log(hasLocationLogic ? '✅ Location-specific mock data present' : '❌ Missing location logic');
if (hasLocationLogic) passedTests++;

// Test 10: Error handling
console.log('\n⚠️  Test 10: Error Handling');
const hasErrorHandling = agentContent.includes('try {') &&
                         agentContent.includes('catch (error)') &&
                         agentContent.includes("recommendation: 'maintain'");
console.log(hasErrorHandling ? '✅ Error handling implemented' : '❌ Missing error handling');
if (hasErrorHandling) passedTests++;

// Additional checks
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔍 Additional Checks\n');

// Check file size
const lines = agentContent.split('\n').length;
const size = Buffer.byteLength(agentContent, 'utf-8');
console.log(`📄 File: ${lines} lines, ${(size / 1024).toFixed(1)} KB`);

// Check sentiment ranges
const hasSentimentRanges = agentContent.includes('0.8') && agentContent.includes('1.3');
console.log(hasSentimentRanges ? '✅ Sentiment ranges defined (0.8x-1.3x)' : '❌ Missing sentiment ranges');

// Check confidence calculation
const hasConfidenceCalc = agentContent.includes('calculateConfidence');
console.log(hasConfidenceCalc ? '✅ Confidence calculation present' : '❌ Missing confidence calculation');

// Check keywords extraction
const hasKeywords = agentContent.includes('extractKeywords');
console.log(hasKeywords ? '✅ Keywords extraction implemented' : '❌ Missing keywords extraction');

// Check seasonal logic
const hasSeasonalLogic = agentContent.includes('month >=') || agentContent.includes('month <=');
console.log(hasSeasonalLogic ? '✅ Seasonal logic present' : '❌ Missing seasonal logic');

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Test Summary\n');

console.log(`✅ Passed: ${passedTests}/${totalTests} tests`);
console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests} tests`);

if (passedTests === totalTests) {
  console.log('\n🎉 All structure tests PASSED!');
  console.log('\nNews Sentiment Agent Features:');
  console.log('  • NewsAPI integration (free tier)');
  console.log('  • Sentiment analysis (positive/negative/neutral)');
  console.log('  • Location-specific mock data');
  console.log('  • Seasonal tourism patterns');
  console.log('  • Tourism impact calculation (0.8x-1.3x)');
  console.log('  • Confidence scoring');
  console.log('  • Keywords extraction');
  console.log('  • Error handling');
  console.log('\n✅ Ready for orchestrator integration!');
} else {
  console.log('\n❌ Some tests failed. Please review the agent structure.');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
