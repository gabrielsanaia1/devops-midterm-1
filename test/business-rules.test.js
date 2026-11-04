const { createMemoryStore } = require('../src/store/memory');
const tasks = require('../src/tasks');

describe('business rules', () => {
  let store;

  beforeEach(() => {
    store = createMemoryStore();
  });

  test('title is trimmed before saving', async () => {
    const task = await tasks.createTask(store, { title: '  Deploy  ' });
    expect(task.title).toBe('Deploy');
    expect((await tasks.getTask(store, task.id)).title).toBe('Deploy');
  });

  test.each([undefined, null, 123, '', '   '])(
    'rejects invalid title: %p',
    async (title) => {
      await expect(tasks.createTask(store, { title }))
        .rejects.toMatchObject({ status: 400 });
    }
  );

  test('rejects missing input', async () => {
    await expect(tasks.createTask(store))
      .rejects.toMatchObject({ status: 400 });
  });

  test.each([1, 100])('accepts a trimmed title of length %i', async (length) => {
    const title = 'a'.repeat(length);
    const task = await tasks.createTask(store, { title: `  ${title}  ` });
    expect(task.title).toBe(title);
  });

  test('rejects a title longer than 100 characters', async () => {
    await expect(tasks.createTask(store, { title: 'a'.repeat(101) }))
      .rejects.toMatchObject({ status: 400 });
  });

  test.each(['low', 'medium', 'high'])('accepts priority %s', async (priority) => {
    const task = await tasks.createTask(store, { title: 'Task', priority });
    expect(task.priority).toBe(priority);
  });

  test('priority filtering preserves newest-first order', async () => {
    const first = await tasks.createTask(store, { title: 'First', priority: 'high' });
    await tasks.createTask(store, { title: 'Other', priority: 'low' });
    const last = await tasks.createTask(store, { title: 'Last', priority: 'high' });

    const result = await tasks.listTasks(store, { priority: 'high' });
    expect(result.map((task) => task.id)).toEqual([last.id, first.id]);
  });

  test('completing twice returns 409 and preserves completedAt', async () => {
    const task = await tasks.createTask(store, { title: 'Task' });

    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2030-01-01T10:00:00Z'));
      const completed = await tasks.completeTask(store, task.id);

      jest.setSystemTime(new Date('2030-01-01T11:00:00Z'));
      await expect(tasks.completeTask(store, task.id))
        .rejects.toMatchObject({ status: 409 });

      const saved = await tasks.getTask(store, task.id);
      expect(saved.completedAt).toBe(completed.completedAt);
    } finally {
      jest.useRealTimers();
    }
  });

  test.each(['getTask', 'completeTask', 'removeTask'])(
    '%s returns 404 for a missing task',
    async (method) => {
      await expect(tasks[method](store, 999))
        .rejects.toMatchObject({ status: 404 });
    }
  );

  test('removes an existing task', async () => {
    const task = await tasks.createTask(store, { title: 'Task' });
    await tasks.removeTask(store, task.id);
    expect(await tasks.listTasks(store)).toEqual([]);
  });

  test('empty store has zero statistics', async () => {
    expect(await tasks.stats(store)).toEqual({
      total: 0, done: 0, open: 0, doneRate: 0,
    });
  });

  test('doneRate is rounded to an integer', async () => {
    const first = await tasks.createTask(store, { title: 'One' });
    await tasks.createTask(store, { title: 'Two' });
    await tasks.createTask(store, { title: 'Three' });
    await tasks.completeTask(store, first.id);

    expect(await tasks.stats(store)).toEqual({
      total: 3, done: 1, open: 2, doneRate: 33,
    });
  });

  test('dueDate is optional', async () => {
    const task = await tasks.createTask(store, { title: 'Task' });
    expect(task.dueDate).toBeNull();
  });

  test.each(['31-12-2099', '2099-13-01', '', 123])(
    'rejects invalid dueDate: %p',
    async (dueDate) => {
      await expect(tasks.createTask(store, { title: 'Task', dueDate }))
        .rejects.toMatchObject({ status: 400 });
    }
  );

  test('accepts today as dueDate', async () => {
    jest.useFakeTimers();
    try {
      jest.setSystemTime(new Date('2030-06-15T12:00:00Z'));
      const task = await tasks.createTask(store, {
        title: 'Task', dueDate: '2030-06-15',
      });
      expect(task.dueDate).toBe('2030-06-15');
    } finally {
      jest.useRealTimers();
    }
  });
});
