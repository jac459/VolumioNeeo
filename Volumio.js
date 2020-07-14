'use strict';

const neeoapi = require('neeo-sdk');
const controller = require('./VolumioController');
const BoseCastController = new controller('192.168.1.7');
const KidsCastController = new controller('192.168.1.6');
const KitchenCastController = new controller('192.168.1.20');
const VolumioController = new controller(null, 'b8:27:eb:96:93:8d');
const ZidooController = new controller(null, '59a6730f-a49f-4680-8a25-621796fe42b6');
const TabSController = new controller(null, '7a9ecb23-7efc-49b5-aa91-9648ae382935');


// First we set the device info, used to identify it on the Brain

const ZidooDriver = neeoapi.buildDevice('jac Player Zidoo v2.0.1')
  .setManufacturer('Volumio')
  .setType('AVRECEIVER')
  .addAdditionalSearchToken('SDK')
  .addButtonGroup('Controlpad')
  .addButtonGroup('Channel Zapper')
  .addButtonGroup('Transport')
  .addButtonGroup('Transport Scan')
  .addButtonGroup('Transport Skip')
  .addButtonGroup('Transport Search')
  .addButtonGroup('Menu and Back')
  .addButton({ name: "GUIDE", label: "Guide"}) 
  .addButton({ name: "INFO", label: "Info"})
  .addButtonGroup('Volume')
  .addButtonGroup('Power')
  .addCapability('alwaysOn')
  .registerSubscriptionFunction(ZidooController.registerStateUpdateCallback)
  .addSlider(
    { name: 'SeekSlider', label: 'Progress', range: [1,100], unit: '%' },
      {
        setter: ZidooController.SeekSliderSet, getter: ZidooController.SeekSliderGet
      })   
  // Then we wire the controller handler for these capabilities
  .addButtonHandler((name, deviceId) => ZidooController.onButtonPressed(name, deviceId))
  .addDirectory({
    name: 'Music',
    label: 'Collection',
  }, ZidooController.browse) // This will forward events to the controller handler
  .addDirectory({
    name: 'Queue',
    label: 'Queue',
  }, ZidooController.browseQueue) // This will forward events to the controller handler
  .addTextLabel(
    { name: '.', label: '' }, ZidooController.getStatus)


const TabSDriver = neeoapi.buildDevice('jac Player TabS v2.0.1')
  .setManufacturer('Volumio')
  .setType('AVRECEIVER')
  .addAdditionalSearchToken('SDK')
  .addButtonGroup('Controlpad')
  .addButtonGroup('Channel Zapper')
  .addButtonGroup('Transport')
  .addButtonGroup('Transport Scan')
  .addButtonGroup('Transport Skip')
  .addButtonGroup('Transport Search')
  .addButtonGroup('Menu and Back')
  .addButton({ name: "GUIDE", label: "Guide"}) 
  .addButton({ name: "INFO", label: "Info"})
  .addButtonGroup('Volume')
  .addButtonGroup('Power')
  .addCapability('alwaysOn')
  .registerSubscriptionFunction(TabSController.registerStateUpdateCallback)
  .addSlider(
    { name: 'SeekSlider', label: 'Progress', range: [1,100], unit: '%' },
      {
        setter: TabSController.SeekSliderSet, getter: TabSController.SeekSliderGet
      })   
  // Then we wire the controller handler for these capabilities
  .addButtonHandler((name, deviceId) => TabSController.onButtonPressed(name, deviceId))
  .addDirectory({
    name: 'Music',
    label: 'Collection',
  }, TabSController.browse) // This will forward events to the controller handler
  .addDirectory({
    name: 'Queue',
    label: 'Queue',
  }, TabSController.browseQueue) // This will forward events to the controller handler
  .addTextLabel(
    { name: '.', label: '' }, TabSController.getStatus)


const BoseCastDriver = neeoapi.buildDevice('jac Player BoseCast v2.0.1')
  .setManufacturer('Volumio')
  .setType('AVRECEIVER')
  .addAdditionalSearchToken('SDK')
  .addButtonGroup('Controlpad')
  .addButtonGroup('Channel Zapper')
  .addButtonGroup('Transport')
  .addButtonGroup('Transport Scan')
  .addButtonGroup('Transport Skip')
  .addButtonGroup('Transport Search')
  .addButtonGroup('Menu and Back')
  .addButton({ name: "GUIDE", label: "Guide"}) 
  .addButton({ name: "INFO", label: "Info"})
  .addButtonGroup('Volume')
  .addButtonGroup('Power')
  .addCapability('alwaysOn')
  .registerSubscriptionFunction(BoseCastController.registerStateUpdateCallback)
  .addSlider(
    { name: 'SeekSlider', label: 'Progress', range: [1,100], unit: '%' },
      {
        setter: BoseCastController.SeekSliderSet, getter: BoseCastController.SeekSliderGet
      })   
  // Then we wire the controller handler for these capabilities
  .addButtonHandler((name, deviceId) => BoseCastController.onButtonPressed(name, deviceId))
  .addDirectory({
    name: 'Music',
    label: 'Collection',
  }, BoseCastController.browse) // This will forward events to the controller handler
  .addDirectory({
    name: 'Queue',
    label: 'Queue',
  }, BoseCastController.browseQueue) // This will forward events to the controller handler
  .addTextLabel(
    { name: '.', label: '' }, BoseCastController.getStatus)


  const VolumioDriver = neeoapi.buildDevice('jac Player Volumio v2.0.1')
  .setManufacturer('Volumio')
  .setType('AVRECEIVER')
  .addAdditionalSearchToken('SDK')
  .addButtonGroup('Controlpad')
  .addButtonGroup('Channel Zapper')
  .addButtonGroup('Transport')
  .addButtonGroup('Transport Scan')
  .addButtonGroup('Transport Skip')
  .addButtonGroup('Transport Search')
  .addButtonGroup('Menu and Back')
  .addButton({ name: "GUIDE", label: "Guide"}) 
  .addButton({ name: "INFO", label: "Info"})
  .addButtonGroup('Volume')
  .addButtonGroup('Power')
  .addCapability('alwaysOn')
  .registerSubscriptionFunction(VolumioController.registerStateUpdateCallback)
  .addSlider(
    { name: 'SeekSlider', label: 'Progress', range: [1,100], unit: '%' },
      {
        setter: VolumioController.SeekSliderSet, getter: VolumioController.SeekSliderGet
      })   
  // Then we wire the controller handler for these capabilities
  .addButtonHandler((name, deviceId) => VolumioController.onButtonPressed(name, deviceId))
  .addDirectory({
    name: 'Music',
    label: 'Collection',
  }, VolumioController.browse) // This will forward events to the controller handler
  .addDirectory({
    name: 'Queue',
    label: 'Queue',
  }, VolumioController.browseQueue) // This will forward events to the controller handler
  .addTextLabel(
    { name: '.', label: '' }, VolumioController.getStatus)

// First we set the device info, used to identify it on the Brain
const KidsCastDriver = neeoapi.buildDevice('jac Player JBL v2.0.1')
.setManufacturer('Volumio')
.setType('AVRECEIVER')
.addAdditionalSearchToken('SDK')
.addButtonGroup('Controlpad')
.addButtonGroup('Channel Zapper')
.addButtonGroup('Transport')
.addButtonGroup('Transport Scan')
.addButtonGroup('Transport Skip')
.addButtonGroup('Transport Search')
.addButtonGroup('Menu and Back')
.addButton({ name: "GUIDE", label: "Guide"}) 
.addButton({ name: "INFO", label: "Info"})
.addButtonGroup('Volume')
.addButtonGroup('Power')
.addCapability('alwaysOn')
.registerSubscriptionFunction(KidsCastController.registerStateUpdateCallback)
.addSlider(
  { name: 'SeekSlider', label: 'Progress', range: [1,100], unit: '%' },
    {
      setter: KidsCastController.SeekSliderSet, getter: KidsCastController.SeekSliderGet
    })   
// Then we wire the controller handler for these capabilities
.addButtonHandler((name, deviceId) => KidsCastController.onButtonPressed(name, deviceId))
.addDirectory({
  name: 'Music',
  label: 'Collection',
}, KidsCastController.browse) // This will forward events to the controller handler
.addDirectory({ 
  name: 'Queue',
  label: 'Queue',
}, KidsCastController.browseQueue) // This will forward events to the controller handler
.addTextLabel(
  { name: '.', label: '' }, KidsCastController.getStatus)

// First we set the device info, used to identify it on the Brain
const KitchenCastDriver = neeoapi.buildDevice('jac Player Google Home v2.0.1')
  .setManufacturer('Volumio')
  .setType('AVRECEIVER')
  .addAdditionalSearchToken('SDK')
  .addButtonGroup('Controlpad')
  .addButtonGroup('Channel Zapper')
  .addButtonGroup('Transport')
  .addButtonGroup('Transport Scan')
  .addButtonGroup('Transport Skip')
  .addButtonGroup('Transport Search')
  .addButtonGroup('Menu and Back')
  .addButton({ name: "GUIDE", label: "Guide"}) 
  .addButton({ name: "INFO", label: "Info"})
  .addButtonGroup('Volume')
  .addButtonGroup('Power')
  .addCapability('alwaysOn')
  .registerSubscriptionFunction(KitchenCastController.registerStateUpdateCallback)
  .addSlider(
    { name: 'SeekSlider', label: 'Progress', range: [1,100], unit: '%' },
      {
        setter: KitchenCastController.SeekSliderSet, getter: KitchenCastController.SeekSliderGet
      })   
  // Then we wire the controller handler for these capabilities
  .addButtonHandler((name, deviceId) => KitchenCastController.onButtonPressed(name, deviceId))
  .addDirectory({
    name: 'Music',
    label: 'Collection',
  }, KitchenCastController.browse) // This will forward events to the controller handler
  .addDirectory({
    name: 'Queue',
    label: 'Queue',
  }, KitchenCastController.browseQueue) // This will forward events to the controller handler
  .addTextLabel(
    { name: '.', label: '' }, KitchenCastController.getStatus)


/*
 * The last step is to export the driver, this makes it available to the
 * to tools like the CLI to start running the driver.
*/
console.log('starting server')

const neeoSettings = {
  brain: "192.168.1.26",
  port: 1501,
  
  name: "JAC Cast",
  devices: [TabSDriver,ZidooDriver, BoseCastDriver, KidsCastDriver, KitchenCastDriver, VolumioDriver]
};
neeoapi
  .startServer(neeoSettings)
  .then(() => {
    console.log("# READY! use the NEEO app to search for: JAC");
  })
  .catch(err => {
    console.log('not working')
    console.error("ERROR!", err);
    process.exit(1);
  });


