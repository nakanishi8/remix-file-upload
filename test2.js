async function testAsync(v) {
  await new Promise((resolve) => {
    setTimeout(resolve, 100);
  });
  return v + 1;
}

const data = [];
const params = [0, 1, 2];
params.forEach(async (v) => {
  const res = await testAsync(v);
  console.log(res);
  data.push(res);
});
console.log(data);
