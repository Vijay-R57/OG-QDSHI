import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingImage from '../assest/image.png';

const PageLoader = ({ loading, children }) => {
  return (
    <>
      <AnimatePresence>
        {loading && (
          <motion.div
            key="page-loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white pointer-events-none"
          >
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              exit={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <motion.img
                src={LoadingImage}
                alt="Loading..."
                className="object-contain"
                animate={{ opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ width: '150px', height: '150px' }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className={loading ? 'hidden' : 'block'}>
        {children}
      </div>
    </>
  );
};

export default PageLoader;
