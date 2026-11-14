# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@1.3.0 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" tailwindcss="plugins:typography,forms" sveltekit-adapter="adapter:vercel" ai-tools="ide:opencode" --install bun astrolife
```

## Adding features

Add features to your project with `sv add`:

```sh
npx sv add
```

For example, to add Tailwind CSS:

```sh
npx sv add tailwindcss
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.


## Base de datos y tripulación

La vista `/` carga la tripulación desde SQLite (`data/astrolife.db`). El archivo
`bd.sql` define el esquema y se aplica automáticamente al abrir la base. No hace
falta ejecutarlo manualmente. Para usar otra base SQLite existente, configura
`DATABASE_PATH` en el entorno del servidor (en Docker, usa una ruta del contenedor).

En una base sin astronautas se crean una sola vez seis perfiles ficticios de
Perú, España, Japón, Brasil, Argentina y Nigeria, con distintos
sexos. Crear, editar, eliminar y completar tareas guarda los cambios en la base.
Los perfiles eliminados no reaparecen al reiniciar. Una base que ya contiene
astronautas conserva sus datos y obtiene perfiles para mostrarlos en la vista.

Las columnas nuevas `nationality` (TEXT, hasta 80 caracteres) y `sex` (TEXT:
`femenino`, `masculino`, `intersexual`, `no_especificado`) permiten NULL para
mantener los registros anteriores. Las tareas y el progreso se guardan en
`crew_tasks` y `crew_profiles`. El registro personal anterior de `/mediciones`
se conserva como `personal_measurements`; `measurements` usa el esquema médico
de `bd.sql`. No se permite eliminar astronautas con historial médico o misiones
asociadas.

Con el contenedor de desarrollo en marcha, verifica los cambios con:

```sh
docker compose exec dev bun run check
docker compose exec dev bun run test:unit -- --run --project server
```

Abre `http://localhost:5175/`, crea un perfil, cambia una tarea y recarga para
comprobar que ambos cambios se conservan.


Al crear o editar un tripulante se puede adjuntar una foto JPG, PNG o WebP de
hasta 2 MB. La foto se guarda como una URL de datos en `astronauts.photo_path`,
junto con el perfil en SQLite. Editar sin seleccionar un archivo conserva la
foto anterior. No se requiere una carpeta de archivos subidos ni un servicio externo.
