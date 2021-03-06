describe('Jasmine', function() {
  var path = require('path'),
      util = require('util'),
      Jasmine = require('../lib/jasmine');

  beforeEach(function() {
    this.bootedJasmine = {
      getEnv: jasmine.createSpy('getEnv').and.returnValue({
        addReporter: jasmine.createSpy('addReporter'),
        execute: jasmine.createSpy('execute')
      }),
      Timer: jasmine.createSpy('Timer'),
      Expectation: {
        addMatchers: jasmine.createSpy('addMatchers')
      }
    };

    this.fakeJasmineCore = {
      boot: jasmine.createSpy('boot').and.returnValue(this.bootedJasmine),
      files: {
        path: 'fake/jasmine/path'
      }
    };

    this.testJasmine = new Jasmine({ jasmineCore: this.fakeJasmineCore });
  });

  describe('constructor options', function() {
    it('have defaults', function() {
      expect(this.testJasmine.projectBaseDir).toEqual(path.resolve());
    });
  });

  it('adds spec files', function() {
    expect(this.testJasmine.specFiles).toEqual([]);
    this.testJasmine.addSpecFile('some/file/path.js');
    expect(this.testJasmine.specFiles).toEqual(['some/file/path.js']);
  });

  describe('#configureDefaultReporter', function() {
    beforeEach(function() {
      spyOn(Jasmine, 'ConsoleReporter').and.returnValue({someProperty: 'some value'});
    });

    it('creates a reporter with the passed in options', function() {
      var reporterOptions = {
        print: 'printer',
        showColors: true,
        jasmineCorePath: 'path',
        timer: 'timer'
      };

      var expectedReporterOptions = Object.keys(reporterOptions).reduce(function(options, key) {
        options[key] = reporterOptions[key];
        return options;
      }, {});

      this.testJasmine.configureDefaultReporter(reporterOptions);

      expect(Jasmine.ConsoleReporter).toHaveBeenCalledWith(expectedReporterOptions);
      expect(this.testJasmine.env.addReporter).toHaveBeenCalledWith({someProperty: 'some value'});
    });

    it('creates a reporter with a default option if an option is not specified', function() {
      var reporterOptions = {};

      this.testJasmine.configureDefaultReporter(reporterOptions);

      var expectedReporterOptions = {
        print: jasmine.any(Function),
        showColors: true,
        timer: jasmine.any(Object),
        jasmineCorePath: 'fake/jasmine/path/jasmine.js'
      };

      expect(Jasmine.ConsoleReporter).toHaveBeenCalledWith(expectedReporterOptions);
      expect(this.testJasmine.env.addReporter).toHaveBeenCalledWith({someProperty: 'some value'});
    });

    describe('passing in an onComplete function', function() {
      it('warns the user of deprecation', function() {
        this.testJasmine.printDeprecation = jasmine.createSpy('printDeprecation');
        var reporterOptions = {
          onComplete: function() {}
        };

        this.testJasmine.configureDefaultReporter(reporterOptions);

        expect(this.testJasmine.printDeprecation).toHaveBeenCalledWith('Passing in an onComplete function to configureDefaultReporter is deprecated.');
      });
    });
  });

  it('adds matchers to the jasmine env', function() {
    this.testJasmine.addMatchers(['fake matcher 1', 'fake matcher 2']);
    expect(this.bootedJasmine.Expectation.addMatchers).toHaveBeenCalledWith(['fake matcher 1', 'fake matcher 2']);
  });

  describe('loading configurations', function() {
    beforeEach(function() {
      this.fixtureJasmine = new Jasmine({
        jasmineCore: this.fakeJasmineCore,
        projectBaseDir: 'spec/fixtures/sample_project'
      });
    });

    describe('from an object', function() {
      var configObject = {
        spec_dir: "spec",
        spec_files: [
          "fixture_spec.js",
          "**/*.js"
        ],
        helpers: [
          "helper.js"
        ]
      };

      it('adds unique specs to the jasmine runner', function() {
        this.fixtureJasmine.loadConfig(configObject);
        expect(this.fixtureJasmine.specFiles).toEqual([
          'spec/fixtures/sample_project/spec/helper.js',
          'spec/fixtures/sample_project/spec/fixture_spec.js',
          'spec/fixtures/sample_project/spec/other_fixture_spec.js'
        ]);
      });
    });

    describe('from a file', function() {
      it('adds unique specs to the jasmine runner', function() {
        this.fixtureJasmine.loadConfigFile('spec/support/jasmine_alternate.json');
        expect(this.fixtureJasmine.specFiles).toEqual([
          'spec/fixtures/sample_project/spec/helper.js',
          'spec/fixtures/sample_project/spec/fixture_spec.js',
          'spec/fixtures/sample_project/spec/other_fixture_spec.js'
        ]);
      });

      it('loads the specified configuration file from an absolute path', function() {
        var absoluteConfigPath = path.join(__dirname, 'fixtures/sample_project/spec/support/jasmine_alternate.json');
        this.fixtureJasmine.loadConfigFile(absoluteConfigPath);
        expect(this.fixtureJasmine.specFiles).toEqual([
          'spec/fixtures/sample_project/spec/helper.js',
          'spec/fixtures/sample_project/spec/fixture_spec.js',
          'spec/fixtures/sample_project/spec/other_fixture_spec.js'
        ]);
      });

      it('loads the default configuration file', function() {
        this.fixtureJasmine.loadConfigFile();
        expect(this.fixtureJasmine.specFiles).toEqual([
          'spec/fixtures/sample_project/spec/fixture_spec.js',
        ]);
      });
    });
  });

  describe('#onComplete', function() {
    it('stores an onComplete function', function() {
      var fakeOnCompleteCallback = function() {};
      spyOn(this.testJasmine.exitCodeReporter, 'onComplete');

      this.testJasmine.onComplete(fakeOnCompleteCallback);
      expect(this.testJasmine.exitCodeReporter.onComplete).toHaveBeenCalledWith(fakeOnCompleteCallback);
    });
  });

  describe('#execute', function() {
    it('uses the default console reporter if no reporters were added', function() {
      spyOn(this.testJasmine, 'configureDefaultReporter');
      spyOn(this.testJasmine, 'loadSpecs');

      this.testJasmine.execute();

      expect(this.testJasmine.configureDefaultReporter).toHaveBeenCalledWith({});
      expect(this.testJasmine.loadSpecs).toHaveBeenCalled();
      expect(this.testJasmine.env.execute).toHaveBeenCalled();
    });

    it('does not add a default reporter if a reporter was already added', function() {
      this.testJasmine.addReporter(new Jasmine.ConsoleReporter({}));

      spyOn(this.testJasmine, 'configureDefaultReporter');
      spyOn(this.testJasmine, 'loadSpecs');

      this.testJasmine.execute();

      expect(this.testJasmine.configureDefaultReporter).not.toHaveBeenCalled();
      expect(this.testJasmine.loadSpecs).toHaveBeenCalled();
      expect(this.testJasmine.env.execute).toHaveBeenCalled();
    });

    it('can run only specified files', function() {
      spyOn(this.testJasmine, 'configureDefaultReporter');
      spyOn(this.testJasmine, 'loadSpecs');

      this.testJasmine.loadConfigFile();

      this.testJasmine.execute(['spec/fixtures/**/*spec.js']);

      var relativePaths = this.testJasmine.specFiles.map(function(path) {
        return path.replace(__dirname, '');
      });

      expect(relativePaths).toEqual(['/fixtures/sample_project/spec/fixture_spec.js', '/fixtures/sample_project/spec/other_fixture_spec.js']);
    });

    it('adds an exit code reporter', function() {
      var exitCodeReporterSpy = jasmine.createSpyObj('reporter', ['onComplete']);
      this.testJasmine.exitCodeReporter = exitCodeReporterSpy;
      spyOn(this.testJasmine, 'addReporter');

      this.testJasmine.execute();

      expect(this.testJasmine.addReporter).toHaveBeenCalledWith(exitCodeReporterSpy);
    });

    describe('default completion behavior', function() {
      it('exits successfully when the whole suite is green', function() {
        var exitSpy = jasmine.createSpy('exit');
        this.testJasmine.exit = exitSpy;

        var exitCodeReporterSpy = jasmine.createSpyObj('reporter', ['onComplete']);
        this.testJasmine.exitCodeReporter = exitCodeReporterSpy;

        this.testJasmine.execute();
        exitCodeReporterSpy.onComplete.calls.mostRecent().args[0](true);
        expect(exitSpy).toHaveBeenCalledWith(0);
      });

      it('exits with a failure when anything in the suite is not green', function() {
        var exitSpy = jasmine.createSpy('exit');
        this.testJasmine.exit = exitSpy;

        var exitCodeReporterSpy = jasmine.createSpyObj('reporter', ['onComplete']);
        this.testJasmine.exitCodeReporter = exitCodeReporterSpy;

        this.testJasmine.execute();
        exitCodeReporterSpy.onComplete.calls.mostRecent().args[0](false);
        expect(exitSpy).toHaveBeenCalledWith(1);
      });
    });
  });
});
