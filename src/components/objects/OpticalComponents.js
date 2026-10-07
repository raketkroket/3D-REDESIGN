// Shared identities for the explanatory view and supplied individual CAD files.
export const opticalComponents = {
 primary: { label:"Primary mirror", cadPart:"primary", description:"The first shallow-angle reflection redirects incoming X-rays toward the secondary mirror." },
 secondary: { label:"Secondary mirror", cadPart:"secondary", description:"The second reflection directs the X-rays toward the focal plane." },
 fpm: { label:"FPM / detector", cadPart:"fpm", description:"The focal-plane module contains the detector at the focused X-ray position." },
 fpcm: { label:"FPCM / camera module", cadPart:"fpcm", description:"The focal-plane camera module supports the detector assembly. The X-ray view shows an illustrative housing; Parts shows the supplied CAD model." },
 tube: { label:"Stray-light tube", description:"This tube helps block light entering from the side before the X-rays reach the detector." },
 rays: { label:"X-ray path", description:"Yellow lines illustrate incoming rays, two reflections and the focal plane. This is a schematic, not visible light." },
};
