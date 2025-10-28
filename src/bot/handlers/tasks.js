/**
 * Manejador de tareas del bot de Telegram
 */

const { createErrorHandler, logger } = require('../utils/errorHandler');

let bot, supabase, userState;

function initializeTaskHandler(dependencies) {
  bot = dependencies.bot;
  supabase = dependencies.supabase;
  userState = dependencies.userState;
}

/**
 * Mostrar menú de tareas
 */
async function showTasksMenu(chatId) {
  const keyboard = [
    [
      { text: '📝 Crear Tarea', callback_data: 'tasks:create' },
      { text: '📋 Ver Tareas', callback_data: 'tasks:list' }
    ],
    [
      { text: '✅ Completadas', callback_data: 'tasks:completed' },
      { text: '⏳ Pendientes', callback_data: 'tasks:pending' }
    ],
    [
      { text: '⬅️ Volver', callback_data: 'back:main' }
    ]
  ];

  await bot.sendMessage(
    chatId,
    '📌 *Gestión de Tareas*\n\nSelecciona una opción:',
    {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    }
  );
}

/**
 * Iniciar flujo de crear tarea
 */
async function startCreateTaskFlow(chatId) {
  const state = userState.get(chatId) || { flow: null, step: null, data: {} };
  state.flow = 'create_task';
  state.step = 'title';
  state.data = {};
  userState.set(chatId, state);

  await bot.sendMessage(
    chatId,
    '📝 *Nueva Tarea*\n\n¿Cuál es el título de la tarea?',
    { parse_mode: 'Markdown' }
  );
}

/**
 * Procesar entrada de tarea
 */
async function handleTaskInput(msg) {
  const chatId = msg.chat.id;
  const state = userState.get(chatId);
  
  if (!state || state.flow !== 'create_task') return;

  const text = (msg.text || '').trim();
  if (!text) {
    await bot.sendMessage(chatId, '❌ Por favor, ingresa un texto válido.');
    return;
  }

  if (state.step === 'title') {
    state.data.title = text;
    state.step = 'description';
    userState.set(chatId, state);

    await bot.sendMessage(
      chatId,
      '📝 *Descripción (opcional)*\n\nIngresa una descripción o escribe "saltar" para continuar:',
      { parse_mode: 'Markdown' }
    );
  } else if (state.step === 'description') {
    if (text.toLowerCase() !== 'saltar') {
      state.data.description = text;
    }
    state.step = 'due_date';
    userState.set(chatId, state);

    await bot.sendMessage(
      chatId,
      '📅 *Fecha de vencimiento (opcional)*\n\nFormato: YYYY-MM-DD o escribe "saltar":',
      { parse_mode: 'Markdown' }
    );
  } else if (state.step === 'due_date') {
    if (text.toLowerCase() !== 'saltar') {
      // Validar formato de fecha
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        await bot.sendMessage(chatId, '❌ Formato inválido. Usa YYYY-MM-DD');
        return;
      }
      state.data.due_date = text;
    }
    
    // Guardar tarea
    await saveTask(chatId, state.data);
    userState.delete(chatId);
  }
}

/**
 * Guardar tarea en base de datos
 */
async function saveTask(chatId, taskData) {
  try {
    // Obtener usuario
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', chatId)
      .single();

    if (!user) {
      await bot.sendMessage(chatId, '❌ Error: Usuario no encontrado.');
      return;
    }

    // Crear tarea
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        title: taskData.title,
        description: taskData.description || null,
        due_date: taskData.due_date || null,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) throw error;

    await bot.sendMessage(
      chatId,
      `✅ *Tarea creada exitosamente*\n\n📌 ${taskData.title}\n\n_ID: ${data.id}_`,
      { parse_mode: 'Markdown' }
    );

    // Mostrar menú de tareas
    await showTasksMenu(chatId);
  } catch (error) {
    logger.error('save_task', error);
    await bot.sendMessage(chatId, '❌ Error al guardar la tarea. Intenta más tarde.');
  }
}

/**
 * Listar tareas
 */
async function listTasks(chatId, filter = 'all') {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', chatId)
      .single();

    if (!user) {
      await bot.sendMessage(chatId, '❌ Error: Usuario no encontrado.');
      return;
    }

    let query = supabase
      .from('tasks')
      .select('id, title, description, due_date, status, created_at')
      .eq('user_id', user.id);

    if (filter === 'pending') {
      query = query.eq('status', 'pending');
    } else if (filter === 'completed') {
      query = query.eq('status', 'completed');
    }

    const { data: tasks, error } = await query
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    if (tasks.length === 0) {
      await bot.sendMessage(
        chatId,
        filter === 'pending' 
          ? '✅ ¡No hay tareas pendientes!' 
          : filter === 'completed'
          ? '📭 No hay tareas completadas'
          : '📭 No hay tareas'
      );
      return;
    }

    let message = filter === 'pending' 
      ? '⏳ *Tareas Pendientes*\n\n'
      : filter === 'completed'
      ? '✅ *Tareas Completadas*\n\n'
      : '📋 *Mis Tareas*\n\n';

    tasks.forEach((task, idx) => {
      const status = task.status === 'completed' ? '✅' : '⏳';
      const dueDate = task.due_date ? ` (${task.due_date})` : '';
      message += `${idx + 1}. ${status} ${task.title}${dueDate}\n`;
      if (task.description) {
        message += `   _${task.description}_\n`;
      }
      message += `   ID: \`${task.id}\`\n\n`;
    });

    const keyboard = [
      [
        { text: '✅ Marcar Completada', callback_data: 'tasks:mark_complete' },
        { text: '🗑️ Eliminar', callback_data: 'tasks:delete' }
      ],
      [
        { text: '⬅️ Volver', callback_data: 'tasks:menu' }
      ]
    ];

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
  } catch (error) {
    logger.error('list_tasks', error);
    await bot.sendMessage(chatId, '❌ Error al obtener tareas.');
  }
}

/**
 * Marcar tarea como completada
 */
async function markTaskComplete(chatId, taskId) {
  try {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'completed' })
      .eq('id', taskId);

    if (error) throw error;

    await bot.sendMessage(chatId, '✅ ¡Tarea marcada como completada!');
    await listTasks(chatId);
  } catch (error) {
    logger.error('mark_task_complete', error);
    await bot.sendMessage(chatId, '❌ Error al actualizar la tarea.');
  }
}

/**
 * Eliminar tarea
 */
async function deleteTask(chatId, taskId) {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    await bot.sendMessage(chatId, '🗑️ Tarea eliminada.');
    await listTasks(chatId);
  } catch (error) {
    logger.error('delete_task', error);
    await bot.sendMessage(chatId, '❌ Error al eliminar la tarea.');
  }
}

/**
 * Enviar recordatorios de tareas pendientes
 */
async function sendTaskReminders() {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, user_id, users(telegram_id)')
      .eq('status', 'pending')
      .lt('due_date', new Date().toISOString().split('T')[0])
      .limit(100);

    if (error) throw error;

    for (const task of tasks || []) {
      const telegramId = task.users?.telegram_id;
      if (telegramId) {
        await bot.sendMessage(
          telegramId,
          `⏰ *Recordatorio de Tarea Vencida*\n\n📌 ${task.title}\n\nEsta tarea venció. ¡Complétala o actualiza la fecha!`,
          { parse_mode: 'Markdown' }
        );
      }
    }

    logger.info('task_reminders_sent', { count: tasks?.length || 0 });
  } catch (error) {
    logger.error('send_task_reminders', error);
  }
}

module.exports = {
  initializeTaskHandler,
  showTasksMenu,
  startCreateTaskFlow,
  handleTaskInput,
  listTasks,
  markTaskComplete,
  deleteTask,
  sendTaskReminders
};
