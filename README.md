# Nebula Xplorer Satellite

As part of the FDND program, we participated in the Hackathon 2026.
Our team consisted of Melissa, Iris, Nayome, and Viresh.

<img width="750" height="500" alt="cover" src="https://github.com/user-attachments/assets/20c9b7d8-5c4b-47cc-bf32-4f2f1568ad0b" />

[bekijk de website](https://xplorersatellite.netlify.app/)

### Project Overview

Our idea was to create an interactive satellite experience that guides users step by step through the different components of a satellite. The goal is to help users understand:

- What each component is
- What it does
- Why it is important

We aimed to make the experience informative, interactive, and engaging for users.

### Technology

To bring this concept to life, we used:

Three.js for the 3D interactive experience
Vite for fast development and performance
Goal

The main goal of this project is to make complex space technology more accessible and enjoyable by combining education with interactive design.

### Replacing supplied CAD models

The presentation loads the satellite from `src/scripts/Satellite.source-colors.glb` and the X-ray instrument from `src/scripts/Instrument.source-colors.glb`. Replace those files with exported, Meshopt-compressed GLBs when the updated STEP files arrive; retain the source filenames to preserve the current loading and interaction flow.

The satellite importer maps the component identifiers `xrayInstrument`, `starTrackerModule`, `dawn4UCubeDrive`, `sBandAntenna`, `sunSensor`, `magnetorquers`, and `solarPanel` from the CAD hierarchy in `src/components/objects/Satellite.js`. Keep the corresponding group-name prefixes in the export, or update that single mapping after verifying click selection. The instrument view keeps the `FPM_(Last)` hierarchy visible and deliberately excludes `FPCM_(Last)` presentation variants.

Run `node verify-models.mjs`, `node verify-performance.mjs`, and `node verify-optics.mjs` after an import. They check CAD color preservation, bounds, component selection, cutaway restoration, instancing, adaptive resolution, and the optical explainer.


https://github.com/user-attachments/assets/48dab2d1-1ea3-45cf-8552-8d4928064c60


### Process

We started with research and inspiration. After several team discussions, we defined our concept and began designing the experience.
Once the design direction was clear, we divided the project into different features. Each team member took ownership of specific parts and worked on developing them.
For a more detailed overview of our process, you can visit our project board, issues and website 
