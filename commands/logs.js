export const logs = async ({ core, module, follow }) => {
  if (follow) {
    for await (const line of core.logs.follow(module)) {
      console.log(line)
    }
  } else {
    process.stdout.write(await core.logs.get(module))
  }
}
