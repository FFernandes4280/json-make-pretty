// Test script to verify the C-style formatter works correctly
import { formatJsonWithValidation } from './cJsonFormatter.js';

const testCases = [
    '{"test":"value","nested":{"array":[1,2,3]}}',
    '{"openFormInCaseOfError":false,"_creationUser":{"_id":"000000000002000000000001"}}',
    '[1,2,3,{"a":"b"}]',
    '{"simple":"test"}',
    '{"empty":{},"nullValue":null,"boolTrue":true,"boolFalse":false}'
];

console.log('Testing C-style JSON formatter:');
console.log('='.repeat(50));

testCases.forEach((testCase, index) => {
    console.log(`\nTest ${index + 1}:`);
    console.log('Input:', testCase);
    
    const result = formatJsonWithValidation(testCase);
    if (result.success) {
        console.log('Output:');
        console.log(result.result);
    } else {
        console.log('Error:', result.error);
    }
    console.log('-'.repeat(30));
});

export { testCases };