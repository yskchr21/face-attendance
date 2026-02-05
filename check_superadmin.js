const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('.env.local file not found!');
        process.exit(1);
    }
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        // Skip comments
        if (line.trim().startsWith('#')) return;
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, ''); // Remove quotes if any
            env[key] = value;
        }
    });

    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
        console.error('Missing Supabase credentials in .env.local');
        process.exit(1);
    }

    const supabase = createClient(url, key);

    async function check() {
        console.log('Checking for superadmin user...');
        const { data, error } = await supabase
            .from('app_users')
            .select('*')
            .eq('role', 'superadmin');

        if (error) {
            console.error('Error querying database:', error.message);
        } else {
            if (data && data.length > 0) {
                console.log('✅ Superadmin found:');
                data.forEach(u => console.log(`- Username: ${u.username}, Role: ${u.role}, Password: ${u.password}`));
            } else {
                console.log('❌ Superadmin NOT found.');
            }
        }
    }

    check();

} catch (err) {
    console.error('Error:', err.message);
}
