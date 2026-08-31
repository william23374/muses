
// Get the ranking // Score list 3. Piano (0: Basic, 1: Advanced), 1. Guitar (1: Advanced, 2: Basic, 0: Intermediate), 2. Ukulele (0: Basic, 1: Advanced), 4: Simplified Notation (0: Basic)
module.exports = (params, useAxios) => {
  return useAxios({
    url: '/opern/v1/home/get_rank_opern',
    encryptType: 'android',
    method: 'POST',
    params: { pagesize: params?.pagesize || 30, page: params?.page || 1, opern_level: params?.level || 0, instruments: params?.instruments || 1, tagid: params?.tagid || 0 },
    cookie: params?.cookie || {},
  });
};

