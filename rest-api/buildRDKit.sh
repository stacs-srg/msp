if [ ! -d "libs/rdkit/make" ]; then
  echo "Not made yet"
  mkdir libs/rdkit/make
  cd libs/rdkit/make
  cmake -D RDK_BUILD_SWIG_WRAPPERS=ON ..
  make 
  make install
fi
echo "Done building rdkit."
