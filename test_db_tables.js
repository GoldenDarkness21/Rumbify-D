require('dotenv').config();
const { supabaseCli } = require('./server/db/users.db');

async function testTables() {
    console.log('Testing table "Codes" (Capital C)...');
    const { data: dataCapital, error: errorCapital } = await supabaseCli
        .from('Codes')
        .select('count')
        .limit(1);

    if (errorCapital) {
        console.log('Error querying "Codes":', errorCapital.message);
    } else {
        console.log('Success querying "Codes". Data:', dataCapital);
    }

    console.log('------------------------------------------------');

    console.log('Testing table "codes" (lowercase c)...');
    const { data: dataLower, error: errorLower } = await supabaseCli
        .from('codes')
        .select('count')
        .limit(1);

    if (errorLower) {
        console.log('Error querying "codes":', errorLower.message);
    } else {
        console.log('Success querying "codes". Data:', dataLower);
    }
}

testTables();
