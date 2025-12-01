import { guidance } from './tools/guidance';
import { projectContext } from './tools/project_context';
import { instructionsStructure } from './tools/instructions_structure';

const args = process.argv.slice(2);
const tool = args[0];
const action = args[2] || 'overview';

(async () => {
  switch (tool) {
    case 'guidance':
      console.log(await guidance({ action }));
      break;
    case 'project_context':
      console.log(await projectContext({ action }));
      break;
    case 'instructions_structure':
      console.log(await instructionsStructure({ action }));
      break;
    default:
      console.log('Usage: node src/index.ts <tool> --action <action>');
  }
})();
