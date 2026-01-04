/**
 * Test CBS Tourism Agent Integration with Orchestrator
 * Validates the integration is working correctly
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 CBS Tourism Agent Integration Test\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// Read orchestrator-v2.ts
const orchestratorPath = join(__dirname, 'lib', 'agents', 'orchestrator-v2.ts');
const orchestratorContent = await readFile(orchestratorPath, 'utf-8');

// Test 1: CBS Tourism Agent import
console.log('\n📦 Test 1: Import Statement');
const hasImport = orchestratorContent.includes("import { analyzeCBSTourism } from './cbs-tourism-agent'");
console.log(hasImport ? '✅ CBS Tourism Agent imported' : '❌ Missing import');

// Test 2: Interface includes cbsTourism
console.log('\n📋 Test 2: Interface Definition');
const hasInterface = orchestratorContent.includes('cbsTourism: any') && 
                     orchestratorContent.includes('cbsTourismConfidence: number');
console.log(hasInterface ? '✅ CBS Tourism fields in interface' : '❌ Missing interface fields');

// Test 3: Option parameter
console.log('\n⚙️  Test 3: Option Parameter');
const hasOption = orchestratorContent.includes('includeCBSTourism?: boolean');
console.log(hasOption ? '✅ includeCBSTourism option defined' : '❌ Missing option');

// Test 4: Variable initialization
console.log('\n🔧 Test 4: Variable Initialization');
const hasInit = orchestratorContent.includes('let cbsTourismData: any = null') &&
                orchestratorContent.includes('let cbsTourismConfidence = 0');
console.log(hasInit ? '✅ CBS Tourism variables initialized' : '❌ Missing initialization');

// Test 5: Stage 2 task
console.log('\n🏃 Test 5: Stage 2 Execution Task');
const hasTask = orchestratorContent.includes('CBS Tourism Agent') &&
                orchestratorContent.includes('analyzeCBSTourism(location, new Date(firstDate))') &&
                orchestratorContent.includes("'cbs_tourism'");
console.log(hasTask ? '✅ CBS Tourism task in Stage 2' : '❌ Missing execution task');

// Test 6: Decision Agent integration
console.log('\n🧠 Test 6: Decision Agent Integration');
const hasDecisionIntegration = orchestratorContent.includes("agentName: 'CBS Tourism Agent'") &&
                                orchestratorContent.includes('if (cbsTourismData)');
console.log(hasDecisionIntegration ? '✅ CBS Tourism integrated with Decision Agent' : '❌ Missing Decision Agent integration');

// Test 7: Return statement
console.log('\n📤 Test 7: Return Statement');
const hasReturn = orchestratorContent.includes('cbsTourism: cbsTourismData') &&
                  orchestratorContent.includes('cbsTourismConfidence,');
console.log(hasReturn ? '✅ CBS Tourism in return statement' : '❌ Missing in return');

// Test 8: Recommended options
console.log('\n🎯 Test 8: Recommended Options');
const nearTermMatch = orchestratorContent.match(/if \(daysAhead <= 7\) \{[\s\S]*?includeCBSTourism: true/);
const shortTermMatch = orchestratorContent.match(/if \(daysAhead <= 30\) \{[\s\S]*?includeCBSTourism: true/);
const longTermMatch = orchestratorContent.match(/return \{[\s\S]*?includeCBSTourism: true[\s\S]*?\}/);
console.log(nearTermMatch ? '✅ Near-term (0-7 days)' : '❌ Missing near-term');
console.log(shortTermMatch ? '✅ Short-term (8-30 days)' : '❌ Missing short-term');
console.log(longTermMatch ? '✅ Long-term (30+ days)' : '❌ Missing long-term');

// Test 9: Console logging
console.log('\n📝 Test 9: Console Logging');
const hasLogging = orchestratorContent.includes('CBSTourism=${includeCBSTourism}') &&
                   orchestratorContent.includes('🏖️  [CBS Tourism Agent]');
console.log(hasLogging ? '✅ CBS Tourism logging present' : '❌ Missing logging');

// Summary
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Integration Test Summary\n');

const allPassed = hasImport && hasInterface && hasOption && hasInit && 
                  hasTask && hasDecisionIntegration && hasReturn && 
                  nearTermMatch && shortTermMatch && longTermMatch && hasLogging;

if (allPassed) {
  console.log('✅ All integration tests PASSED');
  console.log('\n🎉 CBS Tourism Agent successfully integrated with Orchestrator v2!');
  console.log('\nIntegration includes:');
  console.log('  • Import statement');
  console.log('  • Interface definition');
  console.log('  • Option parameter');
  console.log('  • Variable initialization');
  console.log('  • Stage 2 execution task');
  console.log('  • Decision Agent integration');
  console.log('  • Return statement');
  console.log('  • All recommended options (near/short/long term)');
  console.log('  • Console logging');
} else {
  console.log('❌ Some integration tests FAILED');
  console.log('\nPlease review the failed tests above.');
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
