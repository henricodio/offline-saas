/**
 * Script de prueba simple para verificar que el bot funciona
 */

require('dotenv').config();

async function testBot() {
  try {
    console.log('🔧 Verificando configuración...');
    
    // Verificar variables de entorno
    const token = process.env.BOT_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY;
    
    if (!token) {
      throw new Error('❌ BOT_TOKEN no configurado');
    }
    if (!supabaseUrl) {
      throw new Error('❌ SUPABASE_URL no configurado');
    }
    if (!supabaseKey) {
      throw new Error('❌ SUPABASE_SERVICE_ROLE/ANON_KEY no configurado');
    }
    
    console.log('✅ Variables de entorno configuradas');
    
    // Verificar conexión a Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('🔗 Probando conexión a Supabase...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.warn('⚠️ Error conectando a Supabase:', error.message);
    } else {
      console.log('✅ Conexión a Supabase exitosa');
    }
    
    // Verificar que el bot puede inicializarse
    console.log('🤖 Inicializando bot...');
    const TelegramBot = require('node-telegram-bot-api');
    const bot = new TelegramBot(token, { polling: false });
    
    // Verificar que el token es válido
    const me = await bot.getMe();
    console.log(`✅ Bot conectado: @${me.username} (${me.first_name})`);
    
    // Importar módulos principales
    console.log('📦 Verificando módulos...');
    const db = require('./src/bot/services/database');
    const business = require('./src/bot/services/business');
    const { logger } = require('./src/bot/utils/errorHandler');
    
    console.log('✅ Todos los módulos importados correctamente');
    
    // Inicializar servicios
    db.initializeDatabase(supabase);
    console.log('✅ Servicios inicializados');
    
    console.log('\n🎉 ¡Bot listo para ejecutar!');
    console.log('Para iniciar el bot completo, ejecuta: npm start');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error en prueba:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testBot();
