export const asyncHandler = (fn) => {   //a function like controller is came 
  return async (req, res, next) => {    // i am not undastand why its retuern 
    try {
      await fn(req, res, next);     //if evey this fine its run 
    } catch (error) {
      next(error); //if not its not run 
    }
  };
};
