describe('user session timeout', function(){

  it('#renderTimeoutBox window', function(){
    loadFixtures('timeout.html');
    expect($('body').find('.force-alert')).not.toBeVisible();
    cantas.utils.renderTimeoutBox();
    expect($('body').find('.force-alert')).toBeVisible();
  });

  it('#renderClearTimeoutBox window', function(){
    loadFixtures('timeout.html');
    cantas.utils.renderClearTimeoutBox()
    expect($('body').find('.force-alert')).not.toBeVisible();
  });
});
