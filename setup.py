#!/usr/bin/env python
"""Setup script for jupyterchat."""
from setuptools import find_packages, setup
import setuptools.command.build_py


class BuildPyCommand(setuptools.command.build_py.build_py):
  """Custom build command."""

    def _run_npm_build(self):
        """Run npm copying the output to the python/src folder."""
        import subprocess as sp
        sp.run('npm run build', shell=True, check=True)


    def run(self):
        self._run_npm_build()
        setuptools.command.build_py.build_py.run(self)


setup(
    name='jupyterchat',
    version='0.1.0',
    description=(
        'Jupyter notebook extension that enables a simple chatbot.'
    ),
    author='Fabio Zanini',
    author_email='fabio.zanini@unsw.edu.au',
    url='https://github.com/iosonofabio/jupyterchat.git',
    license='MIT',
    long_description="""
Jupyter notebook extension that enables a simple chatbot.
""",
    packages=find_packages('src/python'),
    package_dir={'': 'src/python'},
    include_package_data=True,
    # we can't be zip safe as we require css & js to be available for
    # copying into jupyter data directories
    zip_safe=False,
    cmdclass={
        'build_py': BuildPyCommand,
    },
)
