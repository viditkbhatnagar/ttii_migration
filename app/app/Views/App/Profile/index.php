<div class="container">
  <form action="<?=base_url('app/profile/edit')?>" method="post" enctype="multipart/form-data">
    <div class="row">
      <div class="col-md-4">
        <div class="card rounded-5">
          <div class="card-body">
            <div class="text-center">
              <div
                class="profile-user position-relative d-inline-block mx-auto mb-1"
              >
                <?php if($user_details['image']) { ?>
                    <img
                      src="<?= base_url(get_file($user_details['image'])) ?>"
                      class="rounded-circle avatar-xl img-thumbnail user-profile-image"
                      alt="user-profile-image"
                    />
                <? } else { ?>
                    <img
                      src="<?=base_url('uploads/default-profile-image.png')?>"
                      class="rounded-circle avatar-xl img-thumbnail user-profile-image"
                      alt="user-profile-image"
                    />
                <? } ?>
                <div class="avatar-xs p-0 rounded-circle profile-photo-edit">
                  <input
                    id="profile-img-file-input"
                    type="file"
                    class="profile-img-file-input"
                    name="image"
                  />
                  <label
                    for="profile-img-file-input"
                    class="profile-photo-edit avatar-xs"
                  >
                    <span
                      class="avatar-title rounded-circle bg-white text-body"
                    >
                      <i class="ri-edit-box-fill"></i>
                    </span>
                  </label>
                </div>
              </div>
              <h5 class="fs-16 mb-1"><?=$user_details['name']?></h5>
              <p class="text-muted mb-0"><?=$user_details['phone']?></p>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-8">
        <div class="card rounded-5">
          <div class="card-body p-5">
            <div class="row">
              <div class="col-lg-12">
                <div class="mb-4">
                  <h1 class="h3">My Profile</h1>
                </div>
              </div>
              <div class="col-lg-6">
                <div class="mb-3">
                  <label for="firstnameInput" class="form-label"
                    >Full Name</label
                  >
                  <input
                    type="text"
                    class="form-control"
                    id="firstnameInput"
                    name="name"
                    placeholder="Enter your full name"
                    value="<?=$user_details['name']?>"
                  />
                </div>
              </div>
              <!--end col-->

              <div class="col-lg-6">
                <div class="mb-3">
                  <label for="phonenumberInput" class="form-label"
                    >Phone Number</label
                  >
                  <input
                    type="text"
                    class="form-control"
                    id="phonenumberInput"
                    name="phone"
                    placeholder="Enter your phone number"
                    value="<?=$user_details['phone']?>"
                  />
                </div>
              </div>
              <!--end col-->
              <div class="col-lg-6">
                <div class="mb-3">
                  <label for="emailInput" class="form-label"
                    >Email Address</label
                  >
                  <input
                    type="email"
                    class="form-control"
                    id="emailInput"
                    name="email"
                    placeholder="Enter your email"
                    value="<?=$user_details['user_email']?>"
                  />
                </div>
              </div>
              <!--end col-->
              <div class="col-lg-6">
                <div class="mb-3">
                  <label for="dobInput" class="form-label">Date of Birth</label>
                  <input
                    type="date"
                    class="form-control"
                    data-provider="flatpickr"
                    id="dobInput"
                    data-date-format="d M, Y"
                    name="dob"
                    data-default-date="<?= isset($user_details['dob']) ? date('d M, Y', strtotime($user_details['dob'])) : '' ?>"
                    value="<?= isset($user_details['dob']) ? $user_details['dob'] : '' ?>"
                    placeholder="Select date"
                  />
                </div>
              </div>
            </div>
            <div class="col-lg-12">
              <div class="hstack gap-2 justify-content-end">
                <button type="submit" class="btn btn-myred2">Update</button>
              </div>
            </div>
            <!--end col-->
          </div>
        </div>
      </div>
    </div>
  </form>
</div>
