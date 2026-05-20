export const DEPARTMENTS = [
  { key: 'fgmw',  name: 'Finished Good Material Warehouse', short: 'FGMW',  color: 'emerald', desc: 'Outbound logistics & storage' },
  { key: 'pmw',   name: 'Packing Material Warehouse',       short: 'PMW',   color: 'indigo',  desc: 'Primary & secondary supplies' },
  { key: 'rmw',   name: 'Raw Material Warehouse',           short: 'RMW',   color: 'purple',  desc: 'Inbound stock management' },
  { key: 'ppp',   name: 'Primary Packing Production',       short: 'PPP',   color: 'amber',   desc: 'Production lines & machine yield' },
  { key: 'pop',   name: 'Post Production',                  short: 'POP',   color: 'pink',    desc: 'Inspection, sorting & final checks' },
  { key: 'qcmad', name: 'QC & Microbiology & AD Lab',       short: 'QCMAD', color: 'teal',    desc: 'Quality control testing, microbiological analysis, and analytical development' },
  { key: 'pro',   name: 'Production',                       short: 'PRO',   color: 'yellow',  desc: 'Core manufacturing processes and production output monitoring' },
  { key: 'spp',   name: 'Secondary Packing Production',     short: 'SPP',   color: 'red',     desc: 'Secondary packaging, labeling, and final product preparation' },
  { key: 'fac',   name: 'Facilities',                       short: 'FAC',   color: 'cyan',    desc: 'Maintenance of utilities, equipment, and plant infrastructure' },
];

export const MODULES = [
  { key: 'q', label: 'Quality',  letter: 'Q', bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200' },
  { key: 'd', label: 'Delivery', letter: 'D', bg: 'bg-blue-500',    text: 'text-blue-600',    border: 'border-blue-200'    },
  { key: 's', label: 'Safety',   letter: 'S', bg: 'bg-orange-500',  text: 'text-orange-600',  border: 'border-orange-200'  },
  { key: 'h', label: 'Health',   letter: 'H', bg: 'bg-rose-500',    text: 'text-rose-600',    border: 'border-rose-200'    },
];

export const SPECIAL_DEPARTMENTS = [
  { key: 'ehs',         name: 'Environment, Health & Safety',   short: 'EHS', color: 'lime',   desc: 'Safety compliance, incidents & environmental monitoring', path: '/ehs'         },
  { key: 'engineering', name: 'Engineering & Works Management', short: 'ENG', color: 'sky',    desc: 'Maintenance, utilities & equipment performance',          path: '/engineering' },
  { key: 'hr',          name: 'Human Resources',                short: 'HR',  color: 'orange', desc: 'Workforce training, hiring & compliance tracking',         path: '/hr'          },
];

export const ALL_DEPARTMENTS = [...DEPARTMENTS, ...SPECIAL_DEPARTMENTS];
