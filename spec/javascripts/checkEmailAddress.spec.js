describe( "validate email address", function () {
  var checkEmail = cantas.utils.checkEmail;

  it("It's a valid email address", function () {
    expect(checkEmail("example@redhat.com")).toBe(true);
  });

  it("It's an invalid email address", function () {
    expect(checkEmail("eaample@redhatcom")).toBe(false);
  });
});