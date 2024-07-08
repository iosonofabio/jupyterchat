#!/usr/bin/env python
"""Setup script for jupyterchat."""
from setuptools import find_packages, setup
import setuptools.command.build_py
import setuptools.command.build
from setuptools import Command
import subprocess as sp
import logging


class BuildJSCommand(Command):
    """A custom command to run Pylint on all Python source files."""
    description = 'run npm build'
    user_options = []

    def run(self):
        """Run command."""
        command = ['/usr/bin/npm', 'run', 'build']
        self.announce(
            'Running command: %s' % str(command),
            level=logging.INFO)
        sp.run(command, check=True)

    def initialize_options(self):
        """Set default values for options."""
        pass

    def finalize_options(self):
        """Post-process options."""
        pass


class BuildPyCommand(setuptools.command.build_py.build_py):
    """Custom build command."""

    def run(self):
        self.run_command('build_js')
        setuptools.command.build_py.build_py.run(self)


class BuildCommand(setuptools.command.build.build):
    """Custom build command."""

    def run(self):
        self.run_command('build_js')
        setuptools.command.build.build.run(self)


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
        'build_js': BuildJSCommand,
        'build': BuildCommand,
    },
)
