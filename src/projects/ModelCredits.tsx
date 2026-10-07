import { projectDivisions } from './data';
import { modelCredits } from './model-credits';

// Author profile URLs recorded in the supplied GLB metadata.
const authorUrls: Record<string, string> = {
  embedded: 'https://sketchfab.com/damongraphics',
  robotics: 'https://sketchfab.com/Interbotix',
  software: 'https://sketchfab.com/genoris2',
  iot: 'https://sketchfab.com/MidaZ_3D',
  research: 'https://sketchfab.com/PremModel',
  operations: 'https://sketchfab.com/melaamory',
};

export function ModelCredits() {
  return <details className="model-credits">
    <summary><span>3D model credits</span><span className="model-credits__toggle" aria-hidden="true">+</span></summary>
    <div className="model-credits__body">
      <p className="model-credits__intro">The orbit uses supplied 3D models. Creator and license details below are recorded in the model files.</p>
      <ul>
        {modelCredits.map(credit => <li key={credit.divisionId}>
          <div>
            <span className="model-credits__division">{projectDivisions.find(division => division.id === credit.divisionId)?.name}</span>
            <p className="model-credits__title">{credit.sourceUrl ? <a href={credit.sourceUrl} target="_blank" rel="noopener noreferrer">{credit.title}<span aria-hidden="true"> ↗</span></a> : credit.title}</p>
            <p className="model-credits__author">{credit.author ? <>By {authorUrls[credit.divisionId] ? <a href={authorUrls[credit.divisionId]} target="_blank" rel="noopener noreferrer">{credit.author}</a> : credit.author}</> : 'Creator and license metadata were not included in the supplied file.'}</p>
          </div>
          {credit.license && <span className="model-credits__license">{credit.licenseUrl ? <a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer">{credit.license}<span aria-hidden="true"> ↗</span></a> : credit.license}</span>}
        </li>)}
      </ul>
      <p className="model-credits__changes">Prepared for the orbit with consolidated meshes, simplified geometry, resized WebP textures, and Meshopt compression. Original materials and model identity are retained.</p>
    </div>
  </details>;
}
