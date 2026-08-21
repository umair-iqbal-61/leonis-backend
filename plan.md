POST   /api/pets/:petId/meals           create a new meal entry for a specific pet
GET    /api/pets/:petId/meals           list all meal entries for a specific pet
GET    /api/pets/:petId/meals/:mealId   get details of a specific meal entry for a specific pet
PATCH  /api/pets/:petId/meals/:mealId   update details of a specific meal entry for a specific pet
DELETE /api/pets/:petId/meals/:mealId   delete a specific meal entry for a specific pet


petRoutes complete and attached to the frontend. The frontend is now able to create, read, update, and delete meals for a specific pet. The next step is to implement the meal tracking feature, which will allow users to log meals for their pets and view their meal history.


mealRoutes complete, just need to attach them to frontend.

POST   /api/pets/:petId/weights           create a new weight entry for a specific pet
GET    /api/pets/:petId/weights           list all weight entries for a specific pet
GET    /api/pets/:petId/weights/:weightId   get details of a specific weight entry for a specific pet
PATCH  /api/pets/:petId/weights/:weightId   update details of a specific weight entry for a specific pet
DELETE /api/pets/:petId/weights/:weightId   delete a specific weight entry for a specific pet

weightRoutes complete, just need to attach them to frontend.

POST   /api/pets/:petId/vetvisits           create a new vet visit entry for a specific pet
GET    /api/pets/:petId/vetvisits           list all vet visit entries for a specific pet
GET    /api/pets/:petId/vetvisits/:vetvisitId   get details of a specific vet visit entry for a specific pet
PATCH  /api/pets/:petId/vetvisits/:vetvisitId   update details of a specific vet visit entry for a specific pet
DELETE /api/pets/:petId/vetvisits/:vetvisitId   delete a specific vet visit entry for a specific pet

vetVisitRoutes complete, just need to attach them to frontend.

POST   /api/pets/:petId/reminders           create a new reminder entry for a specific pet
GET    /api/pets/:petId/reminders           list all reminder entries for a specific pet
GET    /api/pets/:petId/reminders/:reminderId   get details of a specific reminder entry for a specific pet
PATCH  /api/pets/:petId/reminders/:reminderId   update details of a specific reminder entry for a specific pet
DELETE /api/pets/:petId/reminders/:reminderId   delete a specific reminder entry for a specific pet