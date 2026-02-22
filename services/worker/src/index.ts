export function startWorker() {
  console.log('worker started');
}

if (process.env.NODE_ENV !== 'test') {
  startWorker();
}
