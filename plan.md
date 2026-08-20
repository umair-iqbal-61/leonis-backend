POST   /api/pets/:petId/meals           create a new meal for a specific pet
GET    /api/pets/:petId/meals           list all meals for a specific pet
GET    /api/pets/:petId/meals/:mealId   get details of a specific meal for a specific pet
PATCH  /api/pets/:petId/meals/:mealId   update details of a specific meal for a specific pet
DELETE /api/pets/:petId/meals/:mealId   delete a specific meal for a specific pet


petRoutes complete and attached to the frontend. The frontend is now able to create, read, update, and delete meals for a specific pet. The next step is to implement the meal tracking feature, which will allow users to log meals for their pets and view their meal history.


mealRoutes complete, just need to attach them to frontend.